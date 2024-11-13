const { combineRgb } = require("@companion-module/base");
const { getUpsStatus } = require("./actions");

module.exports = async function (self) {
    self.setFeedbackDefinitions({
        upsStatus: {
            name: "UPS Status",
            type: "boolean",
            description: "Green = On, Black = Off",
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
                bgcolor: combineRgb(0, 255, 0),
                color: combineRgb(255, 255, 255),
            },
            callback: async (feedback, context) => {
                const outlet = await context.parseVariablesInString(
                    feedback.options.outlet
                );
                try {
                    const state = await getUpsStatus(self, outlet);
                    self.log("info", `Outlet${outlet} state: ${state}`);
                    return state === "On";
                } catch (error) {
                    self.log("error", `Error getting UPS status: ${error}`);
                    return false;
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
    });
};
