const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('TransferStack', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('TransferStack function invoked');

        try {
            const args = await request.json();
            const { PlayFabId: playFabId, SourceInstanceId: sourceInstanceId, TargetInstanceId: targetInstanceId, Amount: amount } = args;

            if (!playFabId || !sourceInstanceId || !targetInstanceId) {
                context.res = { status: 400, body: "Missing required parameters: PlayFabId, SourceInstanceId, TargetInstanceId" };
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

            const sourceItem = await getItemData(playFabId, sourceInstanceId);
            const targetItem = await getItemData(playFabId, targetInstanceId);

            if (!sourceItem || !targetItem) {
                context.res = { status: 404, body: "Source or target item not found" };
                return;
            }

            if (sourceItem.ItemId !== targetItem.ItemId) {
                context.res = { status: 400, body: "Cannot stack different item types" };
                return;
            }

            const sourceUses = sourceItem.RemainingUses || 1;
            const targetUses = targetItem.RemainingUses || 1;

            const transferAmount = (amount && amount > 0) ? Math.min(amount, sourceUses) : sourceUses;

            if (transferAmount > sourceUses) {
                context.res = { status: 400, body: "Amount exceeds source stack count" };
                return;
            }

            const newSourceUses = sourceUses - transferAmount;
            const newTargetUses = targetUses + transferAmount;

            if (newSourceUses > 0) {
                await new Promise((resolve, reject) => {
                    server.ModifyItemUses({
                        PlayFabId: playFabId,
                        ItemInstanceId: sourceInstanceId,
                        UsesToAdd: -transferAmount
                    }, (err, result) => {
                        if (err) {
                            context.log.error('Failed to modify source item uses:', err);
                            return reject(err);
                        }
                        resolve(result);
                    });
                });
            } else {
                await new Promise((resolve, reject) => {
                    server.RevokeInventoryItem({
                        PlayFabId: playFabId,
                        ItemInstanceId: sourceInstanceId
                    }, (err, result) => {
                        if (err) {
                            context.log.error('Failed to revoke source item:', err);
                            return reject(err);
                        }
                        resolve(result);
                    });
                });
            }

            await new Promise((resolve, reject) => {
                server.ModifyItemUses({
                    PlayFabId: playFabId,
                    ItemInstanceId: targetInstanceId,
                    UsesToAdd: transferAmount
                }, (err, result) => {
                    if (err) {
                        context.log.error('Failed to modify target item uses:', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });

            context.log(`Successfully transferred ${transferAmount} uses from ${sourceInstanceId} to ${targetInstanceId}`);
            
            context.res = { 
                status: 200, 
                body: { 
                    Success: true,
                    TransferredAmount: transferAmount,
                    SourceRemaining: newSourceUses,
                    TargetTotal: newTargetUses
                } 
            };
        } catch (err) {
            context.log.error("Failed to transfer stack:", err);
            context.res = { 
                status: 500, 
                body: { 
                    Error: "Server error", 
                    Details: err.message || "Unknown error" 
                } 
            };
        }
    }
});