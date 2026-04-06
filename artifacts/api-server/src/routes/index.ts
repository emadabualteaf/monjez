import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import jobsRouter from "./jobs.js";
import applicationsRouter from "./applications.js";
import ratingsRouter from "./ratings.js";
import creditsRouter from "./credits.js";
import aiParseRouter from "./ai-parse.js";
import adminRouter from "./admin.js";
import reportsRouter from "./reports.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/jobs", applicationsRouter);
router.use("/applications", applicationsRouter);
router.use("/ratings", ratingsRouter);
router.use("/credits", creditsRouter);
router.use("/ai", aiParseRouter);
router.use("/admin", adminRouter);
router.use("/reports", reportsRouter);
router.use("/notifications", notificationsRouter);

export default router;
