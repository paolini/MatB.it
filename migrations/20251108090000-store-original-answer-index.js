'use strict';

function mapAnswersToOriginalIndex(answers) {
  if (!Array.isArray(answers)) return { answers, changed: false };
  let changed = false;
  const updated = answers.map((answer) => {
    if (!answer || !Array.isArray(answer.permutation)) return answer;
    const current = answer.answer;
    if (current === null || current === undefined) return answer;
    if (typeof current !== 'number') return answer;
    if (current < 0 || current >= answer.permutation.length) return answer;
    const originalIndex = answer.permutation[current];
    if (typeof originalIndex !== 'number') return answer;
    if (originalIndex === current) return answer;
    changed = true;
    return { ...answer, answer: originalIndex };
  });
  return { answers: updated, changed };
}

function mapAnswersToPermutedIndex(answers) {
  if (!Array.isArray(answers)) return { answers, changed: false };
  let changed = false;
  const updated = answers.map((answer) => {
    if (!answer || !Array.isArray(answer.permutation)) return answer;
    const current = answer.answer;
    if (current === null || current === undefined) return answer;
    if (typeof current !== 'number') return answer;
    if (current < 0 || current >= answer.permutation.length) return answer;

    const permutedIndex = answer.permutation.indexOf(current);
    if (permutedIndex === -1) return answer;
    if (permutedIndex === current) return answer;
    changed = true;
    return { ...answer, answer: permutedIndex };
  });
  return { answers: updated, changed };
}

module.exports = {
  async up(db) {
    const collection = db.collection('submissions');
    const cursor = collection.find({ answers: { $exists: true, $ne: [] } });
    let updated = 0;

    while (await cursor.hasNext()) {
      const submission = await cursor.next();
      const { answers, changed } = mapAnswersToOriginalIndex(submission.answers);
      if (!changed) continue;

      await collection.updateOne(
        { _id: submission._id },
        { $set: { answers } }
      );
      updated += 1;
    }

    console.log(`store-original-answer-index up: updated ${updated} submissions`);
  },

  async down(db) {
    const collection = db.collection('submissions');
    const cursor = collection.find({ answers: { $exists: true, $ne: [] } });
    let updated = 0;

    while (await cursor.hasNext()) {
      const submission = await cursor.next();
      const { answers, changed } = mapAnswersToPermutedIndex(submission.answers);
      if (!changed) continue;

      await collection.updateOne(
        { _id: submission._id },
        { $set: { answers } }
      );
      updated += 1;
    }

    console.log(`store-original-answer-index down: restored ${updated} submissions`);
  }
};
