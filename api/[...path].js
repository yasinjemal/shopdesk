import { nodeHandler } from '../server/vercel.js';
// Any other /api path gets a JSON 404 from the shared handler instead of an HTML error page.
export default (req, res) => nodeHandler(req, res);
