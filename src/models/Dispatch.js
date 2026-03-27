import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema({
    images: [{
        front: [String],
        back:  [String],      
    }],
    awb: { type: String },
    sampleDispatchDate: { type: Date },
    dispatchQuantity: { type: Number },
    address: { type: String },


    
});



export default mongoose.models.Dispatch || mongoose.model('Dispatch', dispatchSchema);
