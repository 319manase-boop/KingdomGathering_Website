(function () {
    const KGC_EVENT_TIMEZONE = 'Africa/Gaborone';
    const DATE_LOCALE = 'en-BW';
    const DATE_TIME_LOCAL_LOCALE = 'en-GB';

    function pad2(value) {
        return String(value).padStart(2, '0');
    }

    function safeDate(value) {
        if (value == null || value === '') {
            return null;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatWithOptions(value, options, locale = DATE_LOCALE) {
        const date = safeDate(value);
        if (!date) return 'TBA';
        return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: KGC_EVENT_TIMEZONE }, options)).format(date);
    }

    const dateFormatter = { day: 'numeric', month: 'long', year: 'numeric' };
    const shortDateFormatter = { day: 'numeric', month: 'short' };
    const monthYearFormatter = { month: 'long', year: 'numeric' };
    const timeFormatter = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateTimeLocalOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    function formatForDateTimeLocal(value) {
        const date = safeDate(value);
        if (!date) return '';
        const parts = new Intl.DateTimeFormat(DATE_TIME_LOCAL_LOCALE, Object.assign({ timeZone: KGC_EVENT_TIMEZONE }, dateTimeLocalOptions)).formatToParts(date);
        const mapped = {};
        for (const part of parts) {
            if (part.type !== 'literal') {
                mapped[part.type] = part.value;
            }
        }
        if (!mapped.year || !mapped.month || !mapped.day || !mapped.hour || !mapped.minute) {
            return '';
        }
        return `${mapped.year}-${mapped.month}-${mapped.day}T${mapped.hour}:${mapped.minute}`;
    }

    function localDateTimeToISO(value) {
        if (!value) return null;
        const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
        if (!match) return null;
        return `${match[1]}T${match[2]}:00+02:00`;
    }

    function splitDateTimeLocal(value) {
        const formatted = formatForDateTimeLocal(value);
        if (!formatted) return { date: '', time: '' };
        const [date, time] = formatted.split('T');
        return { date: date || '', time: time || '' };
    }

    function areInstantsEqual(start, end) {
        const startDate = safeDate(start);
        const endDate = safeDate(end);
        if (!startDate || !endDate) return false;
        return startDate.getTime() === endDate.getTime();
    }

    function formatEventDate(value) {
        return formatWithOptions(value, dateFormatter);
    }

    function formatEventDateShort(value) {
        return formatWithOptions(value, shortDateFormatter);
    }

    function formatEventMonthYear(value) {
        return formatWithOptions(value, monthYearFormatter);
    }

    function formatEventTime(value) {
        return formatWithOptions(value, timeFormatter);
    }

    function formatEventDateTime(value) {
        const dateValue = formatEventDate(value);
        const timeValue = formatEventTime(value);
        if (dateValue === 'TBA' || timeValue === 'TBA') {
            return 'TBA';
        }
        return `${dateValue}, ${timeValue}`;
    }

    function formatEventTimeRange(start, end) {
        if (!start) return 'TBA';
        const startDate = safeDate(start);
        if (!startDate) return 'TBA';

        const startDateString = formatEventDate(start);
        const startTimeString = formatEventTime(start);

        if (!end) {
            return startTimeString;
        }

        const endDate = safeDate(end);
        if (!endDate) {
            return startTimeString;
        }

        if (areInstantsEqual(start, end)) {
            return startTimeString;
        }

        const endDateString = formatEventDate(end);
        const endTimeString = formatEventTime(end);

        if (startDateString === endDateString) {
            return `${startDateString}, ${startTimeString} – ${endTimeString}`;
        }

        return `${startDateString}, ${startTimeString} – ${endDateString}, ${endTimeString}`;
    }

    window.kgcFormatEventDate = formatEventDate;
    window.kgcFormatEventDateShort = formatEventDateShort;
    window.kgcFormatEventMonthYear = formatEventMonthYear;
    window.kgcFormatEventTime = formatEventTime;
    window.kgcFormatEventDateTime = formatEventDateTime;
    window.kgcFormatEventTimeRange = formatEventTimeRange;
    window.kgcFormatForDateTimeLocal = formatForDateTimeLocal;
    window.kgcLocalDateTimeToISO = localDateTimeToISO;
    window.kgcSplitDateTimeLocal = splitDateTimeLocal;
    window.kgcAreEventInstantsEqual = areInstantsEqual;
    window.kgcDateUtils = {
        formatEventDate,
        formatEventDateShort,
        formatEventMonthYear,
        formatEventTime,
        formatEventDateTime,
        formatEventTimeRange,
        formatForDateTimeLocal,
        localDateTimeToISO,
        splitDateTimeLocal,
        areInstantsEqual
    };
})();
