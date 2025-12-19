const { app } = require('@azure/functions');
const server = require('../helpers/PlayFabServerAPI');

app.http('GetUserInternalData', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('[GetUserInternalData] Function invoked');

        try {
            const body = await request.json();
            context.log('[GetUserInternalData] Body:', JSON.stringify(body));

            // PlayFab sends FunctionArgument, but fallback to direct args
            const args = body.FunctionArgument || body;
            const { PlayFabId } = args;

            if (!PlayFabId) {
                context.log.error('[GetUserInternalData] Missing PlayFabId');
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Success: false,
                        Error: "Missing PlayFabId"
                    })
                };
            }

            context.log(`[GetUserInternalData] PlayFabId=${PlayFabId}`);

            // Získání InternalData přes server API
            const internalData = await new Promise((resolve, reject) => {
                server.GetUserInternalData({ PlayFabId }, (err, result) => {
                    if (err) {
                        context.log.error('[GetUserInternalData] GetUserInternalData error:', err);
                        return reject(err);
                    }
                    context.log('[GetUserInternalData] Result:', JSON.stringify(result?.data));
                    resolve(result?.data?.Data || {});
                });
            });

            const response = {
                Success: true,
                PlayFabId,
                InternalData: internalData
            };

            context.log('[GetUserInternalData] Returning:', JSON.stringify(response));

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response)
            };

        } catch (err) {
            context.log.error('[GetUserInternalData] FAILED:', err);
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
