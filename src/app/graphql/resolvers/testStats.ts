import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { TestStats, ExerciseStats, Test } from '../generated'
import { getSubmissionsCollection } from '@/lib/models'
import { compute_answer_score } from '@/lib/answer'

export default async function testStats(parent: Test, _args: unknown, context: Context): Promise<TestStats> {
    const submissionsCollection = getSubmissionsCollection(context.db)
    
    // Recupera tutte le submissions completate per questo test
    const submissions = await submissionsCollection.find({
        test_id: parent._id,
        completed_on: { $ne: null }
    }).toArray()
    
    const completed_submissions = submissions.length
    const MIN_SUBMISSIONS_FOR_STATS = 5
    
    // Se ci sono meno di 5 submissions, non mostrare le statistiche dettagliate
    if (completed_submissions < MIN_SUBMISSIONS_FOR_STATS) {
        return {
            __typename: 'TestStats',
            completed_submissions,
            exercises: [], // Array vuoto se non ci sono abbastanza submissions
            min_submissions_for_stats: MIN_SUBMISSIONS_FOR_STATS
        }
    }
    
    // Estrai tutti gli esercizi (note_id) dalle submissions esistenti
    const exerciseIds = new Set<string>()
    
    submissions.forEach(submission => {
        submission.answers?.forEach(answer => {
            exerciseIds.add(answer.note_id.toString())
        })
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
    
    return {
        __typename: 'TestStats',
        completed_submissions,
        exercises,
        min_submissions_for_stats: MIN_SUBMISSIONS_FOR_STATS
    }
}