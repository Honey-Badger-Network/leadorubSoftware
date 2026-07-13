const { Schema, model } = require('mongoose')

const BonusesModel = new Schema({
    // bonusDate его наверное стоит ставить на вскр даже если крон рабоатет в пн,вт или пт ставить вскр
    bonusDate: {
        type: String,
        required: true
    },
    bonusType: {
        type: String,
        enum: ['clearBonus']
    },
    bonusText: {
        type: String,
        enum: ['бонус за чистую']
    },
    bonusValue: {
        type: Number,
        required: true
    },
    bonusUserId: {
        type: Schema.Types.ObjectId,
        ref: 'usersModel',
        required: true
    },
    bonusUserName: {
        type: String,
        required: true
    }
})


BonusesModel.statics.updateBonusData = async function(bonusObject) {
    try {
        const result = await this.findOneAndUpdate(
            { bonusDate: bonusObject.bonusDate, bonusUserId: bonusObject.bonusUserId },
            {
                $set: {
                    bonusType: bonusObject.bonusType,
                    bonusText: bonusObject.bonusText,
                    bonusValue: bonusObject.bonusValue,
                    bonusUserName: bonusObject.bonusUserName
                }
            },
            { returnDocument: 'after', upsert: true }
        );
        return result
    } catch (e) {
        console.log(`ошибка с обновлением/созданием бонуса ${e.message}`)
        return null
    }
}

module.exports = model('bonusesModel', BonusesModel)