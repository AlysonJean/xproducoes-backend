import { Router } from "express";
import routes from "../routes";

const apiV1 = Router();

apiV1.use("/", routes);

export default apiV1;
