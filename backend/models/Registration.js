const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registrationId:{ type:String, required:true, unique:true, index:true },
  school:  { type: mongoose.Schema.Types.ObjectId, ref:'School', required:true },
  students:[{ type: mongoose.Schema.Types.ObjectId, ref:'Student', required:true }],
  totalAmount:{ type:Number, required:true, min:70 },
  paymentScreenshot:{
    filename:String, originalName:String, size:Number, mimetype:String, uploadedAt:{ type:Date, default:Date.now }
  },
  status:{ type:String, enum:['pending','verified','rejected'], default:'pending' },
  statusHistory:[{
    status:{ type:String, enum:['pending','verified','rejected'] },
    changedAt:{ type:Date, default:Date.now }, changedBy:String, reason:String
  }],
  notes:{ type:String, maxlength:500 },
  submittedAt:{ type:Date, default:Date.now },
  verifiedAt:Date
},{ timestamps:true });

registrationSchema.statics.generateRegistrationId = ()=>'BOM'+Date.now().toString().slice(-6);
registrationSchema.methods.updateStatus = function(status, by='admin', reason=''){
  this.status=status; this.statusHistory.push({ status, changedBy:by, reason });
  if(status==='verified') this.verifiedAt=new Date();
  return this.save();
};
registrationSchema.statics.getStatistics = async function(){
  const stats = await this.aggregate([{ $group:{ _id:'$status', count:{ $sum:1 }, totalAmount:{ $sum:'$totalAmount' } } }]);
  const total = await this.countDocuments();
  const stu   = await this.aggregate([{ $group:{ _id:null, count:{ $sum:{ $size:'$students' } } }}]);
  return { totalRegistrations:total, totalStudents:stu[0]?.count||0, statusBreakdown:stats,
           totalRevenue:stats.reduce((s,x)=>s+x.totalAmount,0) };
};

module.exports = mongoose.model('Registration', registrationSchema);
