import prisma from '../utils/prismaClient.js';
import { formatMongoCompat } from '../utils/formatMongoCompat.js';

export const checkMaintenanceAndFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const settingsRaw = await prisma.storeSettings.findFirst();
      const settings = formatMongoCompat(settingsRaw);
      if (!settings) {
        return next();
      }

      // If Maintenance Mode is enabled, block all customer actions
      // Admin actions continue to work (admin routes have /api/admin/...)
      const isAdminRoute = req.originalUrl.startsWith('/api/admin');
      if (settings.maintenanceMode && !isAdminRoute) {
        return res.status(503).json({
          maintenance: true,
          message: "We're currently performing maintenance. Please check back shortly."
        });
      }

      // If specific disable flags are active, block customer action
      if (featureName && !isAdminRoute) {
        const isDisabled = settings[featureName];
        if (isDisabled) {
          return res.status(403).json({
            message: `This action is temporarily disabled by the administrator.`
          });
        }
      }

      next();
    } catch (err) {
      console.error('[Maintenance Middleware Error]:', err);
      next();
    }
  };
};
