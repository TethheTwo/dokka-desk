import { createStartHandler } from "@tanstack/react-start/server";
import { defaultStreamHandler } from "@tanstack/react-router/ssr/server";

export default createStartHandler(defaultStreamHandler);
