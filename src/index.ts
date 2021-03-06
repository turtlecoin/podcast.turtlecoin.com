// Copyright (c) 2021, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

import * as Podcast from 'podcast';
import WebApp from '@bitradius/webapp';
import { Logger } from '@turtlepay/logger';
import * as dotenv from 'dotenv';
import { createHmac } from 'crypto';

dotenv.config();

interface IItem {
    title: string;
    description: string;
    url: string;
    date: number;
    episode: number;
    season: number;
    subtitle?: string;
    summary?: string;
    duration: number;
}

interface IFeedData {
    title: string;
    site_url: string;
    feed_url: string;
    image_url: string;
    description: string;
    copyright: string;
    language?: string;
    subtitle?: string;
    summary?: string;
    author: {
        name: string;
        email: string;
    }
    explicit: boolean;
    items: IItem[];
    size: number;
    type: string;
}

const data: IFeedData = require('../data.json');

const generate_guid = (url: string): string => {
    return createHmac('sha256', url)
        .digest('hex');
};

(async () => {
    Logger.info('Generating latest feed data');

    const feed = new Podcast({
        title: data.title,
        description: data.description,
        siteUrl: data.site_url,
        site_url: data.site_url,
        image_url: data.image_url,
        feed_url: data.feed_url,
        author: data.author.name,
        copyright: data.copyright,
        language: data.language || 'en',
        itunesAuthor: data.author.name,
        itunesSubtitle: data.subtitle || data.description,
        itunesSummary: data.summary || data.description,
        pubDate: (new Date(data.items[0].date * 1000)).toUTCString(),
        itunesCategory: [
            {
                text: 'Technology',
                subcats: []
            }
        ],
        itunesType: 'episodic',
        itunesOwner: {
            name: data.author.name,
            email: data.author.email
        },
        itunesImage: data.image_url,
        itunesExplicit: data.explicit
    });

    for (const item of data.items as IItem[]) {
        const guid = generate_guid(item.url + item.title);

        feed.addItem({
            title: item.title,
            description: item.description,
            guid: guid,
            url: data.site_url,
            date: (new Date(item.date * 1000)).toUTCString(),
            itunesAuthor: data.author.name,
            itunesExplicit: data.explicit,
            itunesSubtitle: item.subtitle || item.description,
            itunesSummary: item.summary || item.description,
            itunesImage: data.image_url,
            itunesEpisodeType: 'full',
            itunesTitle: item.title,
            itunesDuration: item.duration || 0,
            itunesEpisode: item.episode,
            itunesSeason: item.season,
            enclosure: {
                url: item.url + '?filename=' + guid + '.mp3',
                type: data.type,
                size: data.size
            }
        });
    }

    const feed_rss = feed.buildXml(' ');

    Logger.info('Generated latest feed data');

    const [controller, app] = await WebApp.create(parseInt(process.env.PORT || '') || 80);

    controller.on('request', (remote_ip, method, url) => {
        Logger.info('[%s] %s => %s', method, remote_ip, url);
    });

    app.get('/feed.rss', (request, response) => {
        response.setHeader('Content-Type', 'application/rss+xml');

        return response.send(feed_rss);
    });

    app.get('/feed.json', (request, response) => {
        return response.json(data);
    });

    app.use('/', controller.static_content(process.cwd() + '/public'));

    await controller.start();

    Logger.info('Web applcation stated');
})();
