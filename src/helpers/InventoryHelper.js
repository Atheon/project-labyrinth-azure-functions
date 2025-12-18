async function getItemCustomData(playFabId, itemInstanceId) {
    return new Promise((resolve, reject) => {
        server.GetUserInventory({
            PlayFabId: playFabId
        }, (err, result) => {
            if (err) return reject(err);
            const item = result.data.Inventory.find(i => i.ItemInstanceId === itemInstanceId);
            resolve(item?.CustomData || {});
        });
    });
}