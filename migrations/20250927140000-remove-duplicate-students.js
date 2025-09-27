const { ObjectId } = require('bson');

module.exports = {
  async up(db) {
    const classes = await db.collection('classes').find({}).toArray();
    for (const cls of classes) {
      if (Array.isArray(cls.students) && cls.students.length > 0) {
        const uniqueStudents = [...new Set(cls.students.map(id => id.toString()))].map(id => new ObjectId(id));
        await db.collection('classes').updateOne(
          { _id: cls._id },
          { $set: { students: uniqueStudents } }
        );
      }
    }
  },

  async down(db) {
    // Non è possibile ripristinare i duplicati rimossi
  }
};
