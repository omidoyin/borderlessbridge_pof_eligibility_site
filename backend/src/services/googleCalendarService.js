const { google } = require('googleapis');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'borderlessbridgehq@gmail.com';

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });
    }
  }

  isConfigured() {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.GOOGLE_REFRESH_TOKEN
    );
  }

  getOAuth2Client() {
    return this.oauth2Client;
  }

  async createEvent({
    fullName,
    email,
    phone,
    bookedDate,
    bookedTime,
    businessRole,
    packageChoice,
    startTimeline,
    guarantee,
    guests,
    salesHeadEmail,
  }) {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar Service is not fully configured (missing env variables).');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const guestEmails = guests ? guests.split(',').map(e => e.trim()).filter(e => !!e) : [];
    const [hours, minutes] = bookedTime.split(':').map(Number);
    
    const startDateTimeObj = new Date(Date.UTC(
      ...bookedDate.split('-').map(Number).map((n, idx) => idx === 1 ? n - 1 : n),
      hours - 1, // WAT is UTC+1, so 9 AM WAT = 8 AM UTC
      minutes
    ));
    const endDateTimeObj = new Date(startDateTimeObj.getTime() + 60 * 60 * 1000); // 1 hour duration

    const attendees = [
      { email: email },
      ...guestEmails.map(gEmail => ({ email: gEmail }))
    ];
    if (salesHeadEmail) {
      attendees.push({ email: salesHeadEmail });
    }

    const event = {
      summary: `Proof of Funds Consultation: ${fullName} & BorderlessBridge`,
      description: `BorderlessBridge Proof of Funds Consultation\n\n` +
       
        `Timeline to Start: ${startTimeline}\n` +
        `Video/Audio Guarantee: ${guarantee}\n` +
        `WhatsApp: ${phone}\n` +
        `Guests: ${guestEmails.join(', ') || 'None'}`,
      start: {
        dateTime: startDateTimeObj.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTimeObj.toISOString(),
        timeZone: 'UTC',
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const gEventRes = await calendar.events.insert({
      calendarId: this.calendarId,
      resource: event,
      conferenceDataVersion: 1, // Required to generate dynamic Google Meet links
      sendUpdates: 'all', // Google automatically emails everyone
    });

    const googleEventId = gEventRes.data.id;
    const googleMeetLink = gEventRes.data.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || null;
    const inviteUrl = gEventRes.data.htmlLink || null;

    return {
      googleEventId,
      googleMeetLink,
      inviteUrl,
    };
  }
}

module.exports = new GoogleCalendarService();
