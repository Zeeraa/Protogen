export function validateConfStringOrThrow(input: any, errorMessage: string): string {
    if (input != null) {
        const str = String(input);
        if (str.length > 0) {
            return str;
        }
    }
    throw new Error(errorMessage);
}

interface ValidateNumberOptions {
    port?: boolean;
    min?: number;
    max?: number;
}

export function validatePort(port: number): boolean {
    return port > 0 && port <= 65535;
}

export function validateConfNumberOrThrow(input: any, errorMessage: string, options: ValidateNumberOptions = {}): number {
    if (input != null) {
        const str = String(input);
        if (str.length > 0) {
            const num = Number(str);
            if (!isNaN(num)) {
                if (options.port == true) {
                    if (num < 1 && num > 65535) {
                        throw new Error(errorMessage);
                    }
                }

                if (options.min != null) {
                    if (num < options.min) {
                        throw new Error(errorMessage);
                    }
                }

                if (options.max != null) {
                    if (num > options.max) {
                        throw new Error(errorMessage);
                    }
                }

                return num;
            }
        }
    }
    throw new Error(errorMessage);
}

interface ValidatePortOptions {
    default?: boolean;
}

export function validateConfBooleanOrThrow(input: any, errorMessage: string, options: ValidatePortOptions = {}): boolean {
    if (input != null) {
        const str = String(input);
        if (str == "true") {
            return true;
        }

        if (str == "false") {
            return false;
        }
    } else {
        if (options.default != null) {
            return options.default;
        }
    }
    throw new Error(errorMessage);
}