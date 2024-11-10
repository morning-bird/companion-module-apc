const { Regex } = require("@companion-module/base");

function getActionDefinitions(self) {
    return {
        recallScene: {
            name: "Recall Scene",
            options: [
                {
                    type: "textinput",
                    id: "group",
                    label: "Group",
                    width: 4,
                    min: 0,
                    default: 0,
                    regex: Regex.SIGNED_NUMBER,
                    useVariables: true,
                },
                {
                    type: "textinput",
                    id: "block",
                    label: "Block",
                    width: 4,
                    min: 0,
                    default: 0,
                    regex: Regex.SIGNED_NUMBER,
                    useVariables: true,
                },
                {
                    type: "textinput",
                    id: "scene",
                    label: "Scene",
                    width: 4,
                    min: 0,
                    default: 0,
                    regex: Regex.SIGNED_NUMBER,
                    useVariables: true,
                },
                {
                    type: "textinput",
                    id: "fadeTime",
                    label: "Fade Time (ms)",
                    width: 8,
                    default: 0,
                    min: 0,
                    regex: Regex.SIGNED_NUMBER,
                    useVariables: true,
                },
            ],
            callback: async (action) => {
                const group = await self.parseVariablesInString(
                    action.options.group
                );
                const block = await self.parseVariablesInString(
                    action.options.block
                );
                const scene = await self.parseVariablesInString(
                    action.options.scene
                );
                const fadeTime = await self.parseVariablesInString(
                    action.options.fadeTime
                );
                if (
                    group === "" ||
                    block === "" ||
                    scene === "" ||
                    fadeTime === ""
                ) {
                    return;
                }
                // const cmd = ">V:1,C:11,G:1234,B:5,S:6,F:3200#";
                const cmd = ">V:1,C:190#";
                const sendBuf = Buffer.from(cmd, "latin1");
                self.log("debug", `Sending command: ${cmd}`);
                if (self.socket !== undefined && self.socket.isConnected) {
                    self.socket.send(sendBuf);
                } else {
                    self.log("debug", "Socket not connected :(");
                }
            },
        },
    };
}

module.exports = { getActionDefinitions };
