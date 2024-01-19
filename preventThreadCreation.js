module.exports = async function ({ config, hooks }) {
    const KEY = 'ptc';
    const truthyValues = ['on', '1', 'true'];
    const falsyValues = ['off', '0', 'false', 'null'];

    function log(message) {
        console.log(`[Prevent Thread Creation] ${message}`);
    }

    /**
     * Parses a boolean from the input string.
     * String must be either truthy or falsy to return boolean
     * @return boolean|null
     */
    function parseCustomBoolean(input) {
        if (typeof input === 'boolean') {
            return input;
        }

        if (truthyValues.includes(input)) return true;
        if (falsyValues.includes(input)) return false;

        return null;
    }

    const SETTING_NAMES = Object.freeze({
        PREVENT_IF_NOT_IN_SERVERS: 'preventIfNotInServers',
        PREVENT_IF_STARTS_WITH: 'preventIfStartsWith',
        CASE_SENSITIVE: 'caseSensitive',
    });

    // Init with defaults
    const settings = new Map([
        [SETTING_NAMES.PREVENT_IF_NOT_IN_SERVERS, []],
        [SETTING_NAMES.PREVENT_IF_STARTS_WITH, []],
        [SETTING_NAMES.CASE_SENSITIVE, false],
    ]);

    // Load config settings
    if (KEY in config) {
        for (const [name, override] of Object.entries(config[KEY])) {
            if (!settings.has(name)) {
                log(`Setting ${name} is not a valid setting`);
            }

            if (name.toLowerCase().includes("enabled")) {
                const parsedBool = parseCustomBoolean(override);

                if (parsedBool === null) {
                    log(`Value ${override} is not a valid truthy or falsy value`);
                } else {
                    settings.set(name, parsedBool);
                }
            } else {
                settings.set(name, override);
            }
        }
    }

    const preventIfNotInServers = settings.get(SETTING_NAMES.PREVENT_IF_NOT_IN_SERVERS);
    const preventIfStartsWithCharacters = settings.get(SETTING_NAMES.PREVENT_IF_STARTS_WITH);
    const caseSensitive = settings.get(SETTING_NAMES.CASE_SENSITIVE);

    if (preventIfNotInServers.length < 1 && preventIfStartsWithCharacters.length < 1) {
        log(`Prevent Thread Creation plugin disengaged, no configuration provided.`);
        return;
    }

    const checkPresenceInServers = async (user, message) => {
        if (preventIfNotInServers.length < 1) {
            return true;
        }

        const serversToCheck = preventIfNotInServers.map(id => message.client.guilds.cache.get(id));
        const userInServers = await Promise.all(serversToCheck.map(
            server => server.fetchMembers({userIDs: [user.id]})
        ));

        return userInServers.some(result => result.length > 0);
    }

    const checkMessageStartsWith = async (message) => {
        const content = caseSensitive ? message.content : message.content.toLowerCase();

        for (const preventOccurrence of preventIfStartsWithCharacters) {
            const occurrence = caseSensitive ? preventOccurrence : preventOccurrence.toLowerCase();

            if (content.startsWith(occurrence)) {
                return true;
            }
        }

        return false;
    }

    const beforeMessage = async ({ user, message, cancel }) => {
        if (!message || message.content.trim().length < 1) {
            return;
        }

        if (!await checkPresenceInServers(user, message)) {
            log(`User ${user.tag} is not in any of the servers`);
            cancel();

            return;
        }

        if (await checkMessageStartsWith(message)) {
            cancel();
        }
    };

    hooks.beforeNewThread(beforeMessage);
    hooks.beforeNewMessageReceived(beforeMessage);

    log(`Prevent Thread Creation plugin engaged. Configured strings:\n${preventIfStartsWithCharacters.join('\n')}`);
};
