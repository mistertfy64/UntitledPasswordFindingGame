const log: {
	error: Function;
	warn: Function;
	info: Function;
	debug: Function;
} = {
	error: (message: string, disablePrefix?: boolean) => {
		console.error(
			`${
				disablePrefix || "[" + new Date().toISOString() + " ERROR]"
			} ${message}`
		);
	},
	warn: (message: string, disablePrefix?: boolean) => {
		console.warn(
			`${
				disablePrefix || "[" + new Date().toISOString() + " WARN]"
			} ${message}`
		);
	},
	info: (message: string, disablePrefix?: boolean) => {
		console.info(
			`${
				disablePrefix || "[" + new Date().toISOString() + " INFO]"
			} ${message}`
		);
	},
	debug: (message: string, disablePrefix?: boolean) => {
		console.debug(
			`${
				disablePrefix || "[" + new Date().toISOString() + " DEBUG]"
			} ${message}`
		);
	},
};

export { log };
