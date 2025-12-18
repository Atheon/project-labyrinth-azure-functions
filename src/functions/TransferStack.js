const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');
const { getItemCustomData } = require('../helpers/InventoryHelper');

app.http('TransferStack', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const args = await request.json();
            const { PlayFabId: playFabId, SourceInstanceId: sourceInstanceId, TargetInstanceId: targetInstanceId, Amount: amount = -1 } = args;

            if (!playFabId || !sourceInstanceId || !targetInstanceId) {
                context.res = { status: 400, body: "Missing required parameters" };
                return;
            }

            const getItemData = async (playFabId, itemInstanceId) => {
                return new Promise((resolve, reject) => {
                    server.GetUserInventory({ PlayFabId: playFabId }, (err, result) => {
                        if (err) return reject(err);
                        const item = result?.data?.Inventory?.find(i => i.ItemInstanceId === itemInstanceId);
                        resolve(item?.CustomData || {});
                    });
                });
            };

            const sourceItem = await getItemData(playFabId, sourceInstanceId);
            const targetItem = await getItemData(playFabId, targetInstanceId);

            // Transfer item (stacking na sebe)
            await new Promise((resolve, reject) => {
                server.TransferItemsToUser({
                    GivingPlayFabId: playFabId,
                    ReceivingPlayFabId: playFabId, // stacking na sebe
                    ItemInstanceIds: [sourceInstanceId]
                }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // TODO: Implement proper stack merging, napr.:
            // - ConsumeItem (odebrat část stacku z sourceItem)
            // - AddInventoryItems (přidat do targetItem)

            context.res = { status: 200, body: { Success: true } };
        } catch (err) {
            context.log.error("Failed to transfer stack:", err);
            context.res = { status: 500, body: "Server error" };
        }
    }
});
