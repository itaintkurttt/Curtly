import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyRouter from "./study";
import authRouter from "./auth";
import reviewersRouter from "./reviewers";
import quizRouter from "./quiz";
import askRouter from "./ask";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studyRouter);
router.use(reviewersRouter);
router.use(quizRouter);
router.use(askRouter);

export default router;
