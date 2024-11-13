const {
    InstanceBase,
    Regex,
    runEntrypoint,
    InstanceStatus,
    TCPHelper,
} = require("@companion-module/base");
const { getActionDefinitions } = require("./actions");
const { Client } = require("ssh2");
const { createAlgorithmsObjectForSSH2 } = require("./algorithms");

const Constants = {
    CMD_ERROR_VAR_NAME: "returnedError",
    CMD_ERROR_FEEDBACK_NAME: "commandErrorState",
    CMD_STATUS_ON: "on",
    RECONNECT_INVERVAL_MS: 1000,
};

class ApcInstance extends InstanceBase {
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
                default: 22,
                min: 1,
                max: 65535,
            },
            {
                type: "textinput",
                id: "username",
                label: "Username",
                default: "apc",
                width: 8,
            },
            {
                type: "textinput",
                id: "password",
                label: "Password",
                width: 8,
            },
        ];
    }

    // allows other files that have a reference to the instance class to grab the constants
    getConstants() {
        return Constants;
    }

    async init(config) {
        this.config = config;
        this.updateStatus(InstanceStatus.Ok);
        this.setActionDefinitions(getActionDefinitions(this));
        this.initSSH();
    }

    destroySSH() {
        if (this.sshClient !== undefined) {
            // clean up the SSH connection
            this.sshClient.destroy();
            delete this.sshClient;
            this.updateStatus(InstanceStatus.Disconnected);
        }
    }

    initSSH() {
        this.destroySSH();
        if (!this.config.host) {
            return;
        }
        this.sshClient = new Client();
        if (this.config.password == null || this.config.password == "") {
            this.log("error", "password is required!");
            return;
        }
        const clientConfig = {
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            password: this.config.password,
            keepaliveInterval: 5000,
            keepaliveCountMax: 3,
            readyTimeout: 20000,
            algorithms: createAlgorithmsObjectForSSH2(0),
            debug: (debugStr) => {
                this.log("debug", debugStr);
            },
        };
        this.log("debug", "try to connect to " + clientConfig.host);
        this.updateStatus(InstanceStatus.Connecting);
        this.sshClient.on("error", (err) => {
            this.log("error", "Server connection error: " + err);
            this.updateStatus(InstanceStatus.ConnectionFailure);
            this.queueReconnect();
        });

        this.sshClient.on("end", () => {
            this.log("error", "Server ended connection");
            this.updateStatus(InstanceStatus.Disconnected);
            this.queueReconnect();
        });

        this.sshClient.on("timeout", () => {
            this.log("error", "Server connection timed out");
            this.updateStatus(InstanceStatus.ConnectionFailure);
            this.queueReconnect();
        });

        this.sshClient.on("connect", () => {
            // once we are connected, we will change the connection status to Connecting, as we still need to auth.
            this.log("debug", "Server connection successful!");
            this.updateStatus(InstanceStatus.Connecting);
        });

        this.sshClient.on("ready", () => {
            this.log("debug", "Server connection ready!");
            this.sshClient.shell((err, stream) => {
                if (err) throw err;

                this.shellStream = stream;

                stream
                    .on("close", (data) => {
                        this.log("debug", "Shell stream closed");
                        this.queueReconnect();
                    })
                    .on("data", (data) => {
                        const dataStr = data.toString();
                        // Cek untuk Outlet1, Outlet2, atau Outlet3
                        const outletMatch = dataStr.match(
                            /Outlet([\d]) State:\s*(\w+)/i
                        );
                        if (outletMatch) {
                            const outletNumber = outletMatch[1];
                            const state = outletMatch[2];
                            this.log(
                                "info",
                                `Outlet${outletNumber} State: ${state}`
                            );
                        }
                    })
                    .stderr.on("data", (data) => {
                        this.log("error", "STDERR: " + data);
                    });
                setTimeout(() => {
                    stream.end("ups -os 1\n");
                }, 100);
            });
            this.updateStatus(InstanceStatus.Ok);
        });
        try {
            this.sshClient.connect(clientConfig);
        } catch (exc) {
            this.log("error", "initiating connection failed, error: " + err);
            this.updateStatus(InstanceStatus.ConnectionFailure);
            return;
        }
    }

    queueReconnect() {
        if (this.reconnectTimer !== undefined) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.initSSH();
        }, Constants.RECONNECT_INVERVAL_MS);
    }

    async destroy() {
        this.log("debug", "destroy");

        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
        }

        this.destroySSH();

        if (this.reconnectTimer !== undefined) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
    }
}

runEntrypoint(ApcInstance, []);
