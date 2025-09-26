import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { TestStats, ExerciseStats, Test, ScoreDistributionEntry } from '../generated'
import { getSubmissionsCollection } from '@/lib/models'
import { compute_answer_score } from '@/lib/answer'

export default async function testStats(parent: Test, _args: unknown, context: Context): Promise<TestStats> {
    const submissionsCollection = getSubmissionsCollection(context.db)
    
    // Recupera tutte le submissions completate per questo test
    const all_submissions = await submissionsCollection.find({
        test_id: parent._id,
        // completed_on: { $ne: null }
    }).toArray()
    
    const submissions = all_submissions.filter(s => !!s.completed_on)
    const completed_submissions = submissions.length
    const incompleted_submissions = all_submissions.length - completed_submissions
    const MIN_SUBMISSIONS_FOR_STATS = 5
    
    // Se ci sono meno di 5 submissions, non mostrare le statistiche dettagliate
    if (completed_submissions < MIN_SUBMISSIONS_FOR_STATS) {
        return {
            __typename: 'TestStats',
            completed_submissions,
            incompleted_submissions,
            exercises: [], // Array vuoto se non ci sono abbastanza submissions
            min_submissions_for_stats: MIN_SUBMISSIONS_FOR_STATS,
            score_distribution: [] // Array vuoto se non ci sono abbastanza submissions
        }
    }
    
    // Estrai tutti gli esercizi (note_id) dalle submissions esistenti
    const exerciseIds = new Set<string>()
    const submissionScores: number[] = [] // Array dei punteggi già calcolati
    
    submissions.forEach(submission => {
        submission.answers?.forEach(answer => {
            exerciseIds.add(answer.note_id.toString())
        })
        
        // Usa il punteggio già memorizzato nel database (calcolato quando la submission è stata completata)
        const score = submission.score ?? 0
        submissionScores.push(score)
    })
    
    // Calcola le statistiche per ogni esercizio
    const exercises: ExerciseStats[] = []
    
    for (const exerciseIdStr of exerciseIds) {
        const exerciseId = new ObjectId(exerciseIdStr)
        
        // Trova tutte le risposte per questo esercizio
        const exerciseAnswers = submissions
            .map(sub => sub.answers?.find(ans => ans.note_id.equals(exerciseId)))
            .filter(Boolean)
        
        const total_answers = exerciseAnswers.length
        const empty_answers = exerciseAnswers.filter(ans => ans!.answer === null || ans!.answer === undefined).length
        const answered = exerciseAnswers.filter(ans => ans!.answer !== null && ans!.answer !== undefined)
        
        // Calcola risposte corrette e score usando la logica esistente
        let correct_answers = 0
        let totalScore = 0
        
        for (const ans of exerciseAnswers) {
            if (ans) {
                const score = compute_answer_score(ans)
                totalScore += score
                
                // Una risposta è considerata corretta se ha score = 1
                if (score === 1) {
                    correct_answers++
                }
            }
        }
        
        // Calcola score medio per questo esercizio
        let average_score: number | null = null
        if (exerciseAnswers.length > 0) {
            average_score = totalScore / exerciseAnswers.length
        }
        
        // Per ora mettiamo correlation_to_total a null - richiede calcoli più complessi
        const correlation_to_total: number | null = null
        
        exercises.push({
            __typename: 'ExerciseStats',
            correct_answers,
            total_answers,
            empty_answers,
            average_score,
            correlation_to_total
        })
    }
    
    // Calcola la distribuzione dei punteggi usando i punteggi già memorizzati
    const scoreDistribution = new Map<number, {min: number, max: number, count: number}>()

    function getOrCreate(key: number) {
        if (!scoreDistribution.has(key)) {
            scoreDistribution.set(key, {min: Infinity, max: -Infinity, count: 0});
        }
        return scoreDistribution.get(key)!;
    }

    for (const totalScore of submissionScores) {
        const key = Math.floor(totalScore+0.00001); // Aggiungi una piccola epsilon per gestire i casi come 2.9999999
        const range = getOrCreate(key);
        range.count++;
        range.min = Math.min(range.min, totalScore);
        range.max = Math.max(range.max, totalScore);
    }
    
    // Converti la mappa in array di ScoreDistributionEntry, ordinato per score_min
    const score_distribution = Array.from(scoreDistribution.values())
        .map(({min, max, count}) => ({
            __typename: 'ScoreDistributionEntry' as const,
            score_min: min,
            score_max: max,
            count
        }))
        .sort((a, b) => a.score_min - b.score_min)

    return {
        __typename: 'TestStats',
        completed_submissions,
        incompleted_submissions,
        exercises,
        min_submissions_for_stats: MIN_SUBMISSIONS_FOR_STATS,
        score_distribution
    }
}