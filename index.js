const {
    InstanceBase,
    Regex,
    runEntrypoint,
    InstanceStatus,
    TCPHelper,
} = require("@companion-module/base");
const { getActionDefinitions } = require("./actions");

class HelvarInstance extends InstanceBase {
    // Konfigurasi untuk opsi modul
    getConfigFields() {
        return [
            {
                type: "textinput",
                id: "host",
                label: "Target IP",
                width: 8,
                regex: Regex.IP,
            },
            {
                type: "textinput",
                id: "port",
                label: "Target Port",
                width: 4,
                regex: Regex.PORT,
                min: 1,
                max: 65535,
            },
        ];
    }

    async init(config) {
        this.config = config;
        this.updateStatus(InstanceStatus.Ok);
        this.setActionDefinitions(getActionDefinitions(this));
        await this.configUpdated(config);
    }

    initTcp() {
        if (this.socket) {
            this.socket.destroy();
            delete this.socket;
        }

        this.updateStatus(InstanceStatus.Connecting);

        if (!this.config.host || !this.config.port) {
            this.updateStatus(InstanceStatus.BadConfig);
            return;
        }
        this.socket = new TCPHelper(this.config.host, this.config.port);
        this.socket.on("status_change", (status, message) => {
            this.updateStatus(status, message);
        });
        this.socket.on("error", (err) => {
            this.updateStatus(InstanceStatus.ConnectionFailure, err.message);
            this.log("error", "Network error: " + err.message);
        });
        this.socket.on("data", (data) => {
            this.log("debug", "Received data: " + data);
        });
    }

    // Method untuk memperbarui konfigurasi
    async configUpdated(config) {
        if (this.socket) {
            this.socket.destroy();
            delete this.socket;
        }
        this.config = config;
        this.initTcp();
        // this.initVariables();
    }

    initVariables() {
        this.setVariableDefinitions([
            { name: "Last TCP Response", variableId: "tcp_response" },
        ]);
        this.setVariableValues({ tcp_response: "" });
    }

    async destroy() {
        if (this.socket) {
            this.socket.destroy();
        } else {
            this.updateStatus(InstanceStatus.Disconnected);
        }
    }
}

runEntrypoint(HelvarInstance, []);
