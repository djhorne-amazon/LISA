import path from 'path';
import * as yaml from 'js-yaml';
import fs from 'fs';
import { Config, ConfigFile, ConfigSchema } from '../../../lib/schema';


export default class ConfigParser {

    static parseConfig(configPaths = ['config.yaml']): Config {
        // Read configuration file
        const configData = configPaths.map(configPath => {
            const configFilePath = path.join(__dirname, `../mocks/${configPath}`);
            const configFile = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as ConfigFile;
            const configEnv = configFile.env || 'dev';
            if (!configFile[configEnv]) {
                throw new Error(`Configuration for environment "${configEnv}" not found.`);
            }
            return configFile[configEnv]
        })
        .reduce((result, obj)=>({...result, ...obj}));

        // Validate and parse configuration
        let config;
        try {
            config = ConfigSchema.parse(configData);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error parsing the configuration:', error.message);
            } else {
                console.error('An unexpected error occurred:', error);
            }
            process.exit(1);
        }
        return config;
    }
}
