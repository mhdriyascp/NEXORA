import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it("reports ok status for the api service", () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("api");
    expect(typeof result.uptimeSeconds).toBe("number");
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
