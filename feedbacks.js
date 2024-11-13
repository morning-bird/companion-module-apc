const { combineRgb } = require("@companion-module/base");
const { getUpsStatus } = require("./actions");

module.exports = async function (self) {
    self.setFeedbackDefinitions({
        upsStatus: {
            name: "UPS Status",
            type: "boolean",
            description:
                "Menunjukkan status UPS outlet (Hijau = On, Merah = Off)",
            options: [
                {
                    type: "textinput",
                    label: "Outlet",
                    id: "outlet",
                    default: "1",
                    width: 4,
                    regex: self.REGEX_NUMBER,
                    useVariables: true,
                },
            ],
            defaultStyle: {
                bgcolor: combineRgb(255, 0, 0),
                color: combineRgb(255, 255, 255),
            },
            callback: async (feedback) => {
                const outlet = await self.parseVariablesInString(
                    feedback.options.outlet
                );
                try {
                    const state = await getUpsStatus(self, outlet);
                    if (state === "On") {
                        return {
                            bgcolor: combineRgb(0, 255, 0), // Hijau
                            color: combineRgb(0, 0, 0),
                        };
                    } else {
                        return {
                            bgcolor: combineRgb(255, 0, 0), // Merah
                            color: combineRgb(255, 255, 255),
                        };
                    }
                } catch (error) {
                    self.log("error", `Error getting UPS status: ${error}`);
                    return {
                        bgcolor: combineRgb(0, 0, 0),
                        color: combineRgb(255, 255, 255),
                    };
                }
            },
        },
        [self.getConstants().CMD_ERROR_FEEDBACK_NAME]: {
            name: "Command Error",
            type: "boolean",
            description:
                "Feedback that will activate when the last command(s) ran either returned a non 0 error code, or outputed any data to STDERR.",
            Styles: {
                bgcolor: combineRgb(255, 0, 0),
                color: combineRgb(0, 0, 0),
            },
            options: [],
            callback: (feedback) => {
                var returnedError = self.getVariableValue(
                    self.getConstants().CMD_ERROR_VAR_NAME
                );
                return returnedError;
            },
        },
        [self.getConstants().CMD_STATUS_ON]: {
            name: "Command Status On",
            type: "boolean",
            Styles: {
                bgcolor: combineRgb(0, 255, 0),
                color: combineRgb(0, 0, 0),
            },
            description: "Feedback that will activate when the command is on",
            callback: (feedback) => {
                return true;
            },
        },
    });
};
