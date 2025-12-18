const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('UpdateItemSlot', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const args = await request.json();
            const { PlayFabId: playFabId, ItemInstanceId: itemInstanceId, NewSlot: newSlot } = args;

            if (!playFabId || !itemInstanceId || newSlot === undefined) {
                context.res = { status: 400, body: "Missing required parameters: PlayFabId, ItemInstanceId, NewSlot" };
                return;
            }

            if (newSlot !== -1 && (newSlot < 0 || newSlot > 49)) {
                context.res = { status: 400, body: "Invalid slot index: " + newSlot };
                return;
            }

            const updateSlot = async (playFabId, itemInstanceId, slotIndex) => {
                return new Promise((resolve, reject) => {
                    server.UpdateUserInventoryItemData({
                        PlayFabId: playFabId,
                        ItemInstanceId: itemInstanceId,
                        Data: { "SlotIndex": slotIndex.toString() }
                    }, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            };

            await updateSlot(playFabId, itemInstanceId, newSlot);

            context.res = {
                status: 200,
                body: { Success: true, ItemInstanceId: itemInstanceId, NewSlot: newSlot }
            };
        } catch (err) {
            context.log.error("Failed to update item slot:", err);
            context.res = { status: 500, body: "Error: " + (err.message || err) };
        }
    }
});
