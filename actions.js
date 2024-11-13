const { Regex } = require("@companion-module/base");

function execCommand(self, cmd) {
    self.sshClient.shell((err, stream) => {
        if (err) {
            return;
        }
        stream.stderr.on("data", (data) => {
            self.setVariableValues({
                [self.getConstants().CMD_ERROR_VAR_NAME]: true,
            });
            self.checkFeedbacks(self.getConstants().CMD_ERROR_FEEDBACK_NAME);
            self.log(
                "error",
                "Command: " + cmd + " wrote to STDERR: " + data.toString()
            );
        });
        stream.write(cmd + "\n");
    });
}

async function getUpsStatus(self, outlet) {
    const cmd = `ups -os ${outlet}`;
    const promise = new Promise((resolve, reject) => {
        self.sshClient.shell((err, stream) => {
            if (err) {
                reject(err);
                return;
            }
            stream.stderr.on("data", (data) => {
                self.setVariableValues({
                    [self.getConstants().CMD_ERROR_VAR_NAME]: true,
                });
                self.checkFeedbacks(
                    self.getConstants().CMD_ERROR_FEEDBACK_NAME
                );
                self.log(
                    "error",
                    "Command: " + cmd + " wrote to STDERR: " + data.toString()
                );
            });

            stream.on("data", (data) => {
                const dataStr = data.toString();
                const outletMatch = dataStr.match(
                    /Outlet([\d]) State:\s*(\w+)/i
                );
                if (outletMatch) {
                    self.checkFeedbacks("upsStatus");
                    const state = outletMatch[2];
                    resolve(state);
                }
            });

            stream.write(cmd + "\n");
        });
    });
    return promise;
}

function getActionDefinitions(self) {
    return {
        turnOn: {
            name: "Turn On",
            options: [
                {
                    id: "outlet",
                    type: "textinput",
                    label: "Outlet",
                    width: 4,
                    default: "1",
                    useVariables: true,
                    regex: Regex.NUMBER,
                },
            ],
            callback: async (action) => {
                const outlet = await self.parseVariablesInString(
                    action.options.outlet
                );
                const state = await getUpsStatus(self, outlet);
                // hanya nyalakan bila memang sedang posisi mati
                if (state === "Off") {
                    execCommand(self, `ups -o ${outlet} On`);
                    self.log("debug", `Outlet${outlet} is turned Nn`);
                }
            },
        },
        turnOff: {
            name: "Turn Off",
            options: [
                {
                    id: "outlet",
                    type: "textinput",
                    label: "Outlet",
                    width: 4,
                    default: "1",
                    useVariables: true,
                    regex: Regex.NUMBER,
                },
            ],
            callback: async (action) => {
                const outlet = await self.parseVariablesInString(
                    action.options.outlet
                );
                const state = await getUpsStatus(self, outlet);
                // hanya matikan bila memang sedang posisi nyala
                if (state === "On") {
                    execCommand(self, `ups -o ${outlet} Off`);
                    self.log("debug", `Outlet${outlet} is turned Off`);
                }
            },
        },
    };
}

module.exports = { getActionDefinitions, getUpsStatus };
