const config = require("./config.js");
const os = require("os");

class Metrics {
  constructor(period) {
    this.totalHttpRequests = {
      GET: 0,
      POST: 0,
      DELETE: 0,
      PUT: 0,
      all: 0,
    };

    this.activeUsers = 0;
    this.authAttempts = {
      total: 0,
      successful: 0,
      failed: 0,
    };
    // this.pizzaSold = 0;
    // this.pizzaRevenue = 0;
    // this.creationLatency = 0;
    // this.creationFailures = 0;

    this.pizzaMetrics = {
      sold: 0,
      revenue: 0,
      creationLatency: 0,
      creationFailures: 0,
    };

    const timer = setInterval(() => {
      try {
        const buf = new MetricBuilder();
        this.collectMetrics(buf);
        const metrics = buf.toString("\n");
        this.sendMetrics(metrics);
      } catch (error) {
        console.log("Error sending metrics", error);
      }
    }, period);
    timer.unref();
  }

  metricsMiddleware() {
    return (req, res, next) => {
      this.incrementHttpRequests(req.method);
      next();
    };
  }

  incrementActiveUsers() {
    this.activeUsers += 1;
  }

  decrementActiveUsers() {
    this.activeUsers -= 1;
  }

  incrementAuthAttempts() {
    this.authAttempts.total += 1;
  }

  incrementSuccessfulAuthAttempts() {
    this.authAttempts.successful += 1;
  }

  incrementFailedAuthAttempts() {
    this.authAttempts.failed += 1;
  }

  trackPurchase(numSold, price, latency, isSuccess) {
    this.pizzaMetrics.sold += numSold;
    this.pizzaMetrics.revenue += price;
    this.pizzaMetrics.creationLatency = latency;
    if (!isSuccess) {
      this.pizzaMetrics.creationFailures += 1;
    }
  }

  incrementHttpRequests(method) {
    this.totalHttpRequests.all++;
    this.totalHttpRequests[method]++;
  }

  recordPurchase(latency, cost, success) {
    this.pizzaMetrics.sold++;
    this.pizzaMetrics.revenue += cost;
    this.pizzaMetrics.creationLatency.push(latency);
    if (!success) {
      this.pizzaMetrics.creationFailures++;
    }
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  collectMetrics(buf) {
    this.httpMetrics(buf);
    this.systemMetrics(buf);
    this.userMetrics(buf);
    this.purchaseMetrics(buf);
    this.authMetrics(buf);
  }

  httpMetrics(buf) {
    for (const [method, count] of Object.entries(this.totalHttpRequests)) {
      buf.addMetric(`http_requests_total`, { method }, count);
    }
  }

  systemMetrics(buf) {
    buf.addMetric(`system_memory_usage`, {}, this.getMemoryUsagePercentage());
    buf.addMetric(`system_cpu_usage`, {}, this.getCpuUsagePercentage());
  }

  userMetrics(buf) {
    buf.addMetric(`active_users`, {}, this.activeUsers);
  }

  purchaseMetrics(buf) {
    buf.addMetric(`pizzas_sold`, {}, this.pizzaMetrics.sold);
    buf.addMetric(`revenue_generated`, {}, this.pizzaMetrics.revenue);
    buf.addMetric(`creation_latency`, {}, this.pizzaMetrics.creationLatency);
    buf.addMetric(`creation_failures`, {}, this.pizzaMetrics.creationFailures);
  }

  authMetrics(buf) {
    buf.addMetric(`auth_attempts_total`, {}, this.authAttempts.total);
    buf.addMetric(`auth_attempts_successful`, {}, this.authAttempts.successful);
    buf.addMetric(`auth_attempts_failed`, {}, this.authAttempts.failed);
  }

  sendMetrics(metrics) {
    fetch(`${config.metrics.url}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}`,
      },
      body: metrics,
    })
      .then((response) => {
        if (!response.ok) {
          response.json().then((error) => {
            console.error(error);
          });
          console.error("Failed to push metrics data to Grafana");
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error("Error pushing metrics:", error);
      });
  }
}

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(name, labels, value) {
    const labelsString = Object.entries(labels)
      .map(([key, val]) => `${key}=${val}`)
      .join(",");

    const methodLabel = labelsString ? `${labelsString}` : "";

    this.metrics.push(
      `request,source=${config.metrics.source}${
        methodLabel ? "," + methodLabel : ""
      } ${name}=${value}`
    );

    // this.metrics.push(
    //   `request,source=${config.metrics.source},${labelsString},${name}=${value}`
    // );
  }

  toString(separator) {
    return this.metrics.join(separator);
  }
}

const metrics = new Metrics(1000);
module.exports = metrics;
