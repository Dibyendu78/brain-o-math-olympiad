const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true,required: true },
  name:      { type: String, required: true, trim: true, maxlength: 100 },
  class:     { type: String, required: true, enum: ['3','4','5','6','7','8','9','10','11','12'] },
  category:  { type: String, required: true, enum: ['A','B','C','D','E'] },
  subjects:  { type: String, required: true, enum: ['math','science','both'] },
  fee:       { type: Number, required: true, min: 70 },
  parentName:{ type: String, trim: true, maxlength: 100 },
  parentContact: {
    type: String,
    validate: { validator:v=>!v||/^[0-9]{10}$/.test(v), message:'Contact must be 10 digits' }
  },
  registrationId:{ type:String, required:true, index:true }
},{ timestamps:true });

studentSchema.statics.calculateCategory = cls=>{
  cls=+cls; if(cls<=4) return 'A'; if(cls<=6) return 'B'; if(cls<=8) return 'C'; if(cls<=10) return 'D'; return 'E';
};
studentSchema.statics.calculateFee = subj => subj==='both'?140:70;

module.exports = mongoose.model('Student', studentSchema);
