import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { TestStats, ExerciseStats, Test, ScoreDistributionEntry } from '../generated'
import { getSubmissionsCollection } from '@/lib/models'
import { compute_answer_score } from '@/lib/answer'
import { MongoAnswer } from '@/lib/models'

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
    
    const generate_stats = completed_submissions >= MIN_SUBMISSIONS_FOR_STATS;
    
    // Estrai tutti gli esercizi (note_id) e i punteggi dalle submissions esistenti
    const { exerciseIds, submissionScores } = extractExerciseIdsAndScores(submissions)
    
    // Calcola le statistiche per ogni esercizio
    const exercises: ExerciseStats[] = generate_stats 
        ? computeAllExerciseStats(submissions, submissionScores, exerciseIds)
        : [];
    
    // Calcola la distribuzione dei punteggi usando i punteggi già memorizzati
    const score_distribution = generate_stats 
        ? computeScoreDistribution(submissionScores)
        : [];   

    return {
        __typename: 'TestStats',
        completed_submissions,
        incompleted_submissions,
        min_submissions_for_stats: MIN_SUBMISSIONS_FOR_STATS,
        exercises,
        score_distribution
    }
}

function extractExerciseIdsAndScores(submissions: Array<{ answers?: MongoAnswer[]; score?: number }>): { exerciseIds: Set<string>, submissionScores: number[] } {
    const exerciseIds = new Set<string>();
    const submissionScores: number[] = [];
    submissions.forEach(submission => {
        submission.answers?.forEach(answer => {
            exerciseIds.add(answer.note_id.toString());
        });
        const score = submission.score ?? 0;
        submissionScores.push(score);
    });
    return { exerciseIds, submissionScores };
}

function computeAllExerciseStats(
    submissions: Array<{ answers?: MongoAnswer[]; score?: number }>,
    submissionScores: number[],
    exerciseIds: Set<string>
): ExerciseStats[] {
    function computeExerciseStats(
        exerciseId: ObjectId,
        submissions: Array<{ answers?: MongoAnswer[]; score?: number }>,
        submissionScores: number[]
    ): ExerciseStats {
        let correct_answers = 0;
        let totalScore = 0;
        const exerciseScores: number[] = [];
        const scoresForCorrelation: number[] = [];

        for (let idx = 0; idx < submissions.length; idx++) {
            const sub = submissions[idx];
            const ans = sub.answers?.find((a: MongoAnswer) => a.note_id.equals(exerciseId));
            if (ans) {
                const score = compute_answer_score(ans);
                exerciseScores.push(score);
                scoresForCorrelation.push(submissionScores[idx]);
                totalScore += score;
                if (score === 1) {
                    correct_answers++;
                }
            }
        }

        const total_answers = exerciseScores.length;
        const empty_answers = exerciseScores.filter((_, i) => {
            const sub = submissions[i];
            const ans = sub.answers?.find((a: MongoAnswer) => a.note_id.equals(exerciseId));
            return ans && (ans.answer === null || ans.answer === undefined);
        }).length;

        let average_score: number | null = null;
        if (exerciseScores.length > 0) {
            average_score = totalScore / exerciseScores.length;
        }

        function pearsonCorrelation(x: number[], y: number[]): number | null {
            if (x.length !== y.length || x.length === 0) return null;
            const n = x.length;
            const avgX = x.reduce((a, b) => a + b, 0) / n;
            const avgY = y.reduce((a, b) => a + b, 0) / n;
            let num = 0, denX = 0, denY = 0;
            for (let i = 0; i < n; i++) {
                const dx = x[i] - avgX;
                const dy = y[i] - avgY;
                num += dx * dy;
                denX += dx * dx;
                denY += dy * dy;
            }
            const den = Math.sqrt(denX * denY);
            return den === 0 ? null : num / den;
        }
        const correlation_to_total: number | null = pearsonCorrelation(exerciseScores, scoresForCorrelation);

        return {
            __typename: 'ExerciseStats',
            correct_answers,
            total_answers,
            empty_answers,
            average_score,
            correlation_to_total
        };
    }
    const exercises: ExerciseStats[] = [];
    for (const exerciseIdStr of exerciseIds) {
        const exerciseId = new ObjectId(exerciseIdStr);
        exercises.push(computeExerciseStats(exerciseId, submissions, submissionScores));
    }
    return exercises;
}

function computeScoreDistribution(submissionScores: number[]): ScoreDistributionEntry[] {
    const scoreDistribution = new Map<number, {min: number, max: number, count: number}>();
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
    return Array.from(scoreDistribution.values())
        .map(({min, max, count}) => ({
            __typename: 'ScoreDistributionEntry' as const,
            score_min: min,
            score_max: max,
            count
        }))
        .sort((a, b) => a.score_min - b.score_min);
}

