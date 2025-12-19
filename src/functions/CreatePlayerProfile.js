const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('CreatePlayerProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('[CreatePlayerProfile] Function invoked');
        
        try {
            const body = await request.json();
            context.log('[CreatePlayerProfile] Body:', JSON.stringify(body));
            
            // PlayFab sends FunctionArgument, but fallback to direct args
            const args = body.FunctionArgument || body;
            const { PlayFabId } = args;

            if (!PlayFabId) {
                context.log.error('[CreatePlayerProfile] Missing PlayFabId');
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Success: false,
                        Error: "Missing PlayFabId"
                    })
                };
            }

            context.log(`[CreatePlayerProfile] PlayFabId=${PlayFabId}`);

            const existingData = await new Promise((resolve, reject) => {
                server.GetUserInternalData({ PlayFabId }, (err, result) => {
                    if (err) {
                        context.log.error('[CreatePlayerProfile] GetUserInternalData error:', err);
                        return reject(err);
                    }
                    context.log('[CreatePlayerProfile] GetUserInternalData result:', JSON.stringify(result?.data));
                    resolve(result?.data?.Data || {});
                });
            });

            let created = false;
            let alreadyInitialized = false;

            if (existingData?.Initialized?.Value === "true") {
                context.log('[CreatePlayerProfile] Already initialized');
                alreadyInitialized = true;
            } else {
                context.log('[CreatePlayerProfile] Creating new profile');
                const initialData = {
                    Initialized: "true",
                    InventoryV2Ready: "true",
                    EconomyV2Ready: "true"
                };
                await new Promise((resolve, reject) => {
                    server.UpdateUserInternalData(
                        { PlayFabId, Data: initialData },
                        (err, result) => {
                            if (err) {
                                context.log.error('[CreatePlayerProfile] UpdateUserInternalData error:', err);
                                return reject(err);
                            }
                            context.log('[CreatePlayerProfile] Profile created');
                            resolve(result);
                        }
                    );
                });
                created = true;
            }

            const response = {
                Success: true,
                Created: created,
                AlreadyInitialized: alreadyInitialized
            };

            context.log('[CreatePlayerProfile] Returning:', JSON.stringify(response));

            // Return with explicit JSON stringification for PlayFab CloudScript v2
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response)
            };

        } catch (err) {
            context.log.error('[CreatePlayerProfile] FAILED:', err);
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Success: false,
                    Error: err.message || String(err)
                })
            };
        }
    }
});