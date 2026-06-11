import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ttsRouter from "./tts";
import storyRouter from "./story";
import voicesRouter from "./voices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ttsRouter);
router.use(storyRouter);
router.use(voicesRouter);

export default router;
