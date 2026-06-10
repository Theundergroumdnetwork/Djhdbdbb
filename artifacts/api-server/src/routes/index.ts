import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storyRouter from "./story";
import ttsRouter from "./tts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storyRouter);
router.use(ttsRouter);

export default router;
