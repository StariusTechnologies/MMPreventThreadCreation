module.exports = async function ({ config, hooks }) {
    const KEY = 'pec';
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
        IGNORED_STARTS_WITH: 'ignoredStartsWith',
        CASE_SENSITIVE: 'caseSensitive',
    });

    // Init with defaults
    const settings = new Map([
        [SETTING_NAMES.IGNORED_STARTS_WITH, []],
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

    const ignoredStartsWith = settings.get(SETTING_NAMES.IGNORED_STARTS_WITH);
    const caseSensitive = settings.get(SETTING_NAMES.CASE_SENSITIVE);

    if (ignoredStartsWith.length < 1) {
        return;
    }

    hooks.beforeNewThread = ({ message, cancel }) => {
        if (!message || message.content.trim().length < 1) {
            return;
        }

        const content = caseSensitive ? message.content : message.content.toLowerCase();

        for (const ignoredOccurrence of ignoredStartsWith) {
            const occurrence = caseSensitive ? ignoredOccurrence : ignoredOccurrence.toLowerCase();

            if (content.startsWith(occurrence)) {
                cancel();
                return;
            }
        }
    };
};
