const PlayFab = require("playfab-sdk/Scripts/PlayFab/PlayFabServer");

PlayFab.settings.titleId = process.env.PLAYFAB_TITLE_ID;
PlayFab.settings.developerSecretKey = process.env.PLAYFAB_SECRET_KEY;

module.exports = PlayFab;