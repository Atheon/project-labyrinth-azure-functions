const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('CreatePlayerProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const args = await request.json();
            const { PlayFabId } = args;

            if (!PlayFabId) {
                context.res = {
                    status: 400,
                    body: {
                        Success: false,
                        Error: "Missing PlayFabId"
                    }
                };
                return;
            }

            context.log(`[CreatePlayerProfile] PlayFabId=${PlayFabId}`);

            const existingData = await new Promise((resolve, reject) => {
                server.GetUserInternalData({ PlayFabId }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result?.Data || {});
                });
            });

            let created = false;
            let alreadyInitialized = false;

            if (existingData?.Initialized?.Value === "true") {
                alreadyInitialized = true;
            } else {
                const initialData = {
                    Initialized: "true",
                    InventoryV2Ready: "true",
                    EconomyV2Ready: "true"
                };
                await new Promise((resolve, reject) => {
                    server.UpdateUserInternalData(
                        { PlayFabId, Data: initialData },
                        (err) => err ? reject(err) : resolve()
                    );
                });
                created = true;
            }

            context.res = {
                status: 200,
                body: {
                    Success: true,
                    Created: created,
                    AlreadyInitialized: alreadyInitialized
                }
            };

        } catch (err) {
            context.log.error("[CreatePlayerProfile] FAILED", err);
            context.res = {
                status: 500,
                body: {
                    Success: false,
                    Error: err.message || String(err)
                }
            };
        }
    }
});
