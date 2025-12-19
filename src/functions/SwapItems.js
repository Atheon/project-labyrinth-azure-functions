const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('SwapItems', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('SwapItems function invoked');

        try {
            const args = await request.json();
            const { PlayFabId: playFabId, ItemInstanceId1: itemInstanceId1, ItemInstanceId2: itemInstanceId2 } = args;

            if (!playFabId || !itemInstanceId1 || !itemInstanceId2) {
                context.res = { status: 400, body: "Missing required parameters" };
                return;
            }

            const getItemCustomData = async (playFabId, itemInstanceId) => {
                return new Promise((resolve, reject) => {
                    server.GetUserInventory({ PlayFabId: playFabId }, (err, result) => {
                        if (err) return reject(err);
                        const item = result?.data?.Inventory?.find(i => i.ItemInstanceId === itemInstanceId);
                        resolve(item?.CustomData || {});
                    });
                });
            };

            const item1 = await getItemCustomData(playFabId, itemInstanceId1);
            const item2 = await getItemCustomData(playFabId, itemInstanceId2);

            const slot1 = item1?.SlotIndex ?? "10";
            const slot2 = item2?.SlotIndex ?? "10";

            const updateItemSlot = async (playFabId, itemInstanceId, slotIndex) => {
                return new Promise((resolve, reject) => {
                    server.UpdateUserInventoryItemData({
                        PlayFabId: playFabId,
                        ItemInstanceId: itemInstanceId,
                        Data: { SlotIndex: slotIndex.toString() }
                    }, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            };

            await updateItemSlot(playFabId, itemInstanceId1, slot2);
            await updateItemSlot(playFabId, itemInstanceId2, slot1);

            context.res = { status: 200, body: { Success: true } };
        } catch (err) {
            context.log.error("Failed to swap items:", err);
            context.res = { status: 500, body: "Server error" };
        }
    }
});