const { getWhishClient, parseCallbackUrl, buildCallbackUrl } = require("./whish");

const getApiBaseUrl = () =>
  (process.env.BASE_URL || "http://localhost:5016").replace(/\/$/, "");

const getHandizSiteUrl = () =>
  (process.env.HANDIZ_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const createWhishPaymentSession = async ({
  req,
  amount,
  currency,
  invoice,
  externalId,
  successRedirectUrl,
  failureRedirectUrl,
}) => {
  const whish = getWhishClient();
  if (!whish) {
    return { ok: false, status: 503, message: "Payment system not configured" };
  }

  const apiBase = getApiBaseUrl();

  const result = await whish.createPayment({
    amount,
    currency,
    invoice,
    externalId,
    successCallbackUrl: `${apiBase}/api/v1/webhooks/whish/success`,
    failureCallbackUrl: `${apiBase}/api/v1/webhooks/whish/failure`,
    successRedirectUrl,
    failureRedirectUrl,
  });

  if (!result.success) {
    return {
      ok: false,
      status: 400,
      message: result.dialog?.message || "Could not start Whish payment",
      code: result.code,
    };
  }

  return {
    ok: true,
    collectUrl: result.collectUrl,
  };
};

const verifyWhishCallback = async (req) => {
  const whish = getWhishClient();
  if (!whish) {
    throw new Error("Whish not configured");
  }

  const callbackData = parseCallbackUrl(buildCallbackUrl(req));
  const { externalId, currency } = callbackData;

  if (!externalId || !currency) {
    return { ok: false, status: 400, message: "Missing payment parameters" };
  }

  const status = await whish.getPaymentStatus(currency, externalId);

  return {
    ok: true,
    externalId: String(externalId),
    callbackData,
    status,
    whish,
  };
};

module.exports = {
  getApiBaseUrl,
  getHandizSiteUrl,
  createWhishPaymentSession,
  verifyWhishCallback,
};
