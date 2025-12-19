const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('SplitStack', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('SplitStack function invoked');

        try {
            const args = await request.json();
            const { PlayFabId: playFabId, ItemInstanceId: itemInstanceId, SplitAmount: splitAmount, ToSlot: toSlot } = args;

            if (!playFabId || !itemInstanceId || !splitAmount || toSlot === undefined) {
                context.res = { status: 400, body: "Missing required parameters" };
                return;
            }

            const getItemData = async (playFabId, itemInstanceId) => {
                return new Promise((resolve, reject) => {
                    server.GetUserInventory({ PlayFabId: playFabId }, (err, result) => {
                        if (err) return reject(err);
                        const item = result?.data?.Inventory?.find(i => i.ItemInstanceId === itemInstanceId);
                        resolve(item);
                    });
                });
            };

            const sourceItem = await getItemData(playFabId, itemInstanceId);

            if (!sourceItem) {
                context.res = { status: 404, body: "Source item not found" };
                return;
            }

            const currentUses = sourceItem.RemainingUses || 1;

            if (splitAmount <= 0 || splitAmount >= currentUses) {
                context.res = { status: 400, body: "Invalid split amount" };
                return;
            }

            const newSourceUses = currentUses - splitAmount;

            await new Promise((resolve, reject) => {
                server.ModifyItemUses({
                    PlayFabId: playFabId,
                    ItemInstanceId: itemInstanceId,
                    UsesToAdd: -splitAmount
                }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            const grantResult = await new Promise((resolve, reject) => {
                server.GrantItemsToUser({
                    PlayFabId: playFabId,
                    ItemIds: [sourceItem.ItemId]
                }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            const newItemInstanceId = grantResult.data.ItemGrantResults[0]?.ItemInstanceId;

            if (newItemInstanceId) {
                await new Promise((resolve, reject) => {
                    server.ModifyItemUses({
                        PlayFabId: playFabId,
                        ItemInstanceId: newItemInstanceId,
                        UsesToAdd: splitAmount - 1
                    }, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });

                await new Promise((resolve, reject) => {
                    server.UpdateUserInventoryItemData({
                        PlayFabId: playFabId,
                        ItemInstanceId: newItemInstanceId,
                        Data: { SlotIndex: toSlot.toString() }
                    }, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }

            context.res = { status: 200, body: { Success: true } };
        } catch (err) {
            context.log.error("Failed to split stack:", err);
            context.res = { status: 500, body: "Server error" };
        }
    }
});