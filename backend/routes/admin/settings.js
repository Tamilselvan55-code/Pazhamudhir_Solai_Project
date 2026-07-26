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
          location: { lat: 13.0606941, lon: 80.2270751 },
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
      'storeStatus', 'openingTime', 'closingTime',
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
    
    // Type casting — Float fields (schema: Float / Float?)
    if (updateData.deliveryRadiusKm !== undefined) updateData.deliveryRadiusKm = parseFloat(updateData.deliveryRadiusKm) || 0;
    if (updateData.gstPercentage !== undefined) updateData.gstPercentage = parseFloat(updateData.gstPercentage) || 0;
    if (updateData.minOrderValue !== undefined) updateData.minOrderValue = parseFloat(updateData.minOrderValue) || 0;
    if (updateData.maxOrderValue !== undefined) updateData.maxOrderValue = parseFloat(updateData.maxOrderValue) || 0;
    if (updateData.freeDeliveryThreshold !== undefined) updateData.freeDeliveryThreshold = parseFloat(updateData.freeDeliveryThreshold) || 0;
    if (updateData.deliveryCharges !== undefined) updateData.deliveryCharges = parseFloat(updateData.deliveryCharges) || 0;
    if (updateData.cancellationTimeLimit !== undefined) updateData.cancellationTimeLimit = parseFloat(updateData.cancellationTimeLimit) || 0;
    if (updateData.sessionTimeout !== undefined) updateData.sessionTimeout = parseFloat(updateData.sessionTimeout) || 0;
    if (updateData.dashboardRefreshInterval !== undefined) updateData.dashboardRefreshInterval = parseFloat(updateData.dashboardRefreshInterval) || 0;

    // Type casting — Int fields (schema: Int / Int?) — must be whole numbers
    if (updateData.maxLoginAttempts !== undefined) updateData.maxLoginAttempts = parseInt(updateData.maxLoginAttempts, 10) || 5;
    if (updateData.smtpPort !== undefined) updateData.smtpPort = parseInt(updateData.smtpPort, 10) || 587;

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

    const adminName = (req.admin && req.admin.name) ? req.admin.name : 'System Admin';
    await prisma.auditLog.create({
      data: {
        adminName,
        action: 'Update System Settings',
        targetType: 'System',
        targetName: 'StoreSettings',
        oldValue: JSON.stringify('Previous Configuration'),
        newValue: JSON.stringify('Updated Configuration')
      }
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
