import { WebInterface } from './components/WebInterface';
import * as dotenv from 'dotenv';

dotenv.config();

const webInterface = new WebInterface();
webInterface.start(3000);

console.log('Starting web interface...'); 