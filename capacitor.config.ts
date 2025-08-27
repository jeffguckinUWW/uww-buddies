import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.diveuww.uwwbuddies',
	appName: 'UWW Buddies',
	webDir: 'build',
	plugins: {
		PushNotifications: {
			presentationOptions: [
				'badge',
				'sound',
				'banner' as any,
				'list' as any
			]
		}
	},
	ios: {
		contentInset: 'always',
		limitsNavigationsToAppBoundDomains: false,
		allowsLinkPreview: false,
		backgroundColor: '#ffffff',
		scrollEnabled: true,
		webContentsDebuggingEnabled: false,
		preferredContentMode: 'mobile',
		scheme: 'App'
	},
	android: {
		allowMixedContent: true,
		backgroundColor: '#ffffff'
	},
	loggingBehavior: 'none'
};

export default config;