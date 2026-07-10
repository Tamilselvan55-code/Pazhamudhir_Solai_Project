import express from 'express';
import { protectAdmin } from '../../middleware/adminAuth.js';
import prisma from '../../utils/prismaClient.js';
import { formatMongoCompat } from '../../utils/formatMongoCompat.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    let settingsRaw = await prisma.storeSettings.findFirst();
    if (!settingsRaw) {
      settingsRaw = await prisma.storeSettings.create({
        data: {
          storeName: 'Tiruchendur Murugan Pazhamudhir Solai',
          location: { lat: 12.9666144, lon: 79.9458077 },
          deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM) || 30,
        }
      });
    }
    res.json(formatMongoCompat(settingsRaw));
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    let settingsRaw = await prisma.storeSettings.findFirst();

    const fields = [
      'storeName', 'storeLogo', 'storeAddress', 'phone', 'email', 'supportWhatsApp', 'workingHours',
      'deliveryRadiusKm', 'currency', 'gstPercentage', 'invoicePrefix', 'invoiceFooter', 'storeDescription',
      'websiteName', 'websiteLogo', 'browserTitle', 'favicon', 'primaryThemeColor', 'secondaryThemeColor',
      'homepageBanner', 'announcementBanner', 'footerContent',
      'defaultLanguage', 'defaultCurrency', 'defaultTheme', 'enableProductReviews', 'enableWishlist',
      'enableSearchSuggestions', 'enableNotifications',
      'maintenanceMode',
      'disableCustomerLogin', 'disableRegistration', 'disableCheckout', 'disableForgotPassword', 'disableOrderPlacement',
      'minOrderValue', 'maxOrderValue', 'freeDeliveryThreshold', 'deliveryCharges', 'deliveryTiming',
      'orderPrefix', 'autoAcceptOrders', 'autoGenerateInvoice', 'cancellationTimeLimit',
      'enableOrderNotifications', 'enableRegistrationNotifications', 'enableLowStockAlerts',
      'enableOfferNotifications', 'enableEmailNotifications', 'enableBrowserNotifications',
      'sessionTimeout', 'maxLoginAttempts', 'passwordPolicy', 'admin2FA',
      'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'senderName', 'senderEmail',
      'dashboardRefreshInterval', 'enableSalesCharts', 'enableRevenueReports', 'enableTopProducts', 'enableCustomerStats',
      'offersBanner', 'aboutUs', 'contactUs', 'privacyPolicy', 'termsAndConditions'
    ];

    const updateData = {};

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.lat !== undefined && req.body.lon !== undefined) {
      updateData.location = { lat: Number(req.body.lat), lon: Number(req.body.lon) };
    }

    if (req.body.orderStatusColors !== undefined) {
      updateData.orderStatusColors = req.body.orderStatusColors;
    }
    
    // Type casting
    if (updateData.deliveryRadiusKm !== undefined) updateData.deliveryRadiusKm = Number(updateData.deliveryRadiusKm);
    if (updateData.gstPercentage !== undefined) updateData.gstPercentage = Number(updateData.gstPercentage);
    if (updateData.minOrderValue !== undefined) updateData.minOrderValue = Number(updateData.minOrderValue);
    if (updateData.maxOrderValue !== undefined) updateData.maxOrderValue = Number(updateData.maxOrderValue);
    if (updateData.freeDeliveryThreshold !== undefined) updateData.freeDeliveryThreshold = Number(updateData.freeDeliveryThreshold);
    if (updateData.deliveryCharges !== undefined) updateData.deliveryCharges = Number(updateData.deliveryCharges);
    if (updateData.cancellationTimeLimit !== undefined) updateData.cancellationTimeLimit = Number(updateData.cancellationTimeLimit);
    if (updateData.sessionTimeout !== undefined) updateData.sessionTimeout = Number(updateData.sessionTimeout);
    if (updateData.maxLoginAttempts !== undefined) updateData.maxLoginAttempts = Number(updateData.maxLoginAttempts);
    if (updateData.dashboardRefreshInterval !== undefined) updateData.dashboardRefreshInterval = Number(updateData.dashboardRefreshInterval);

    const booleanFields = [
      'enableProductReviews', 'enableWishlist', 'enableSearchSuggestions', 'enableNotifications', 'maintenanceMode',
      'disableCustomerLogin', 'disableRegistration', 'disableCheckout', 'disableForgotPassword', 'disableOrderPlacement',
      'autoAcceptOrders', 'autoGenerateInvoice', 'enableOrderNotifications', 'enableRegistrationNotifications', 'enableLowStockAlerts',
      'enableOfferNotifications', 'enableEmailNotifications', 'enableBrowserNotifications', 'admin2FA',
      'enableSalesCharts', 'enableRevenueReports', 'enableTopProducts', 'enableCustomerStats'
    ];
    booleanFields.forEach(f => {
      if (updateData[f] !== undefined) {
        updateData[f] = updateData[f] === true || updateData[f] === 'true';
      }
    });

    const isAnnouncementChanged = updateData.announcementBanner !== undefined && (!settingsRaw || updateData.announcementBanner !== settingsRaw.announcementBanner);
    const isMaintenanceChanged = updateData.maintenanceMode !== undefined && (!settingsRaw || updateData.maintenanceMode !== settingsRaw.maintenanceMode);

    let updatedSettingsRaw;
    if (settingsRaw) {
      updatedSettingsRaw = await prisma.storeSettings.update({
        where: { id: settingsRaw.id },
        data: updateData
      });
    } else {
      updatedSettingsRaw = await prisma.storeSettings.create({ data: updateData });
    }

    const updatedSettings = formatMongoCompat(updatedSettingsRaw);

    if (isAnnouncementChanged || isMaintenanceChanged) {
      (async () => {
        try {
          const users = await prisma.user.findMany({ where: { isBlocked: { not: true } }, select: { id: true } });
          const io = req.app.get('io');
          
          if (isAnnouncementChanged && updatedSettings.announcementBanner) {
            for (const user of users) {
              await createAndEmitNotification(io, {
                userId: user.id,
                title: 'New Store Announcement',
                message: updatedSettings.announcementBanner,
                type: 'general',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
          
          if (isMaintenanceChanged) {
            for (const user of users) {
              await createAndEmitNotification(io, {
                userId: user.id,
                title: updatedSettings.maintenanceMode ? 'System Under Maintenance' : 'System Maintenance Completed',
                message: updatedSettings.maintenanceMode 
                  ? 'We are performing system upgrades. Ordering is temporarily disabled.'
                  : 'System upgrades are complete. You can now place orders normally!',
                type: 'system',
                role: 'customer',
                actionUrl: '/'
              });
            }
          }
        } catch (setNotifErr) {
          console.error('Failed to broadcast store settings notification:', setNotifErr);
        }
      })();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('settings_update', updatedSettings);
    }

    const adminName = req.admin ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action: 'Update System Settings',
        targetType: 'System',
        targetName: 'StoreSettings',
        oldValue: 'Previous Configuration',
        newValue: 'Updated Configuration'
      }
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
