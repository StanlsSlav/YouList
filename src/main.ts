enum LogLevel {
  Info,
  Success,
  Warning,
  Error,
}

type MessageOptions = {
  force?: boolean;
  level?: LogLevel;
};

interface IMessageable {
  tag?: string;
  message: any;
  foreground?: string;
  background?: string;
}
class Logger {
  constructor(isEnabled: boolean = false) {
    this.#isEnabled = isEnabled;
  }

  #isEnabled: boolean;

  log(
    message: any,
    options: MessageOptions = {
      force: false,
      level: LogLevel.Info,
    }
  ): void {
    if (!(this.#isEnabled || options.force)) {
      return;
    }

    switch (options.level) {
      default:
      case LogLevel.Info:
        this.#info(message);
        break;
      case LogLevel.Success:
        this.#success(message);
        break;
      case LogLevel.Warning:
        this.#warning(message);
        break;
      case LogLevel.Error:
        this.#error(message);
        break;
    }
  }

  info(message: any, force: boolean = false): void {
    this.log(message, { force: force, level: LogLevel.Info });
  }

  success(message: any, force: boolean = false): void {
    this.log(message, { force: force, level: LogLevel.Success });
  }

  warning(message: any, force: boolean = false): void {
    this.log(message, { force: force, level: LogLevel.Warning });
  }

  error(message: any, force: boolean = false): void {
    this.log(message, { force: force, level: LogLevel.Error });
  }

  #info(message: any): void {
    this.#colored({
      tag: "INFO",
      message,
      background: "cyan",
    });
  }

  #success(message: any): void {
    this.#colored({ tag: "SUCCESS", message, background: "green" });
  }

  #warning(message: any): void {
    this.#colored({ tag: "WARNING", message, background: "yellow" });
  }

  #error(message: any): void {
    this.#colored({ tag: "ERROR", message, background: "red" });
  }

  #colored(messageable: IMessageable): void {
    let { tag, message, foreground, background } = { ...messageable };
    tag ??= "YL";
    foreground ??= "black";
    background ??= "cyan";

    if (typeof message === "string") {
      console.log(
        `%c ${tag} %c ${message}`,
        `background: ${background}; color: ${foreground}`,
        `background: transparent; color: white`
      );

      return;
    }

    console.log(
      `[%c${tag}%c] ${JSON.stringify(message)}`,
      `background: ${background}; color: ${foreground}`,
      `background: transparent; color: white`
    );
  }
}

class Video {
  constructor(
    title: string,
    channelName: string,
    viewsCount: string,
    element?: HTMLElement
  ) {
    this.title = title;
    this.channelName = channelName;
    this.viewsCount = viewsCount;

    if (element) {
      this.element = element;
    }
  }

  element?: HTMLElement;
  title: string;
  channelName: string;
  viewsCount: string;

  public static extractVideoFromElement(elem: HTMLElement): Video | null {
    const videoTitleQry: string = "#video-title";
    const videoTitle: string | undefined | null =
      elem.querySelector(videoTitleQry)?.textContent;

    const channelNameQry: string = "#text-container > yt-formatted-string > a";
    const channelName: string | undefined | null =
      elem.querySelector(channelNameQry)?.textContent;

    const viewsCountQry: string = "#metadata-line > span";
    const viewsCount: string | undefined | null =
      elem.querySelectorAll(viewsCountQry)[0]?.textContent;

    if (!(channelName && videoTitle && viewsCount)) {
      return null;
    }

    return new Video(videoTitle, channelName, viewsCount, elem);
  }
}

const logger = new Logger(true);

let blackList: string[] = [];

const removeVideo = (video: HTMLElement) => {
  video.parentNode?.removeChild(video);
};

const videoSelector: string = "div#contents > ytd-rich-item-renderer";

const filterVideos = () => {
  logger.log("Filtering videos");

  const videoElems = document.querySelectorAll(videoSelector);
  const videos: Video[] = [];

  for (const videoElem of videoElems) {
    let elem = videoElem as HTMLVideoElement;
    const video: Video | null = Video.extractVideoFromElement(elem);

    if (video === null) {
      continue;
    }

    if (!video.element?.querySelector(".add-blacklist-btn") && video.element) {
      const btn: Element = document.createElement("button");
      btn.classList.add("add-blacklist-btn");
      btn.classList.add("devicon-apachekafka-original");
      btn.addEventListener("click", () => {
        blackList.push(video.channelName);
        logger.success(`Added to blacklist '${video.channelName}'`);

        setChannelsToStorage();
        filterVideos();
      });

      video.element.append(btn);
    }

    logger.log(`Found video '${JSON.stringify(video)}'`);
    videos.push(video);

    let videosRemovedCount: number = 0;
    blackList.forEach((ignoredChannel) => {
      if (ignoredChannel.includes(video.channelName)) {
        videosRemovedCount += 1;
        removeVideo(elem);
      }
    });

    logger.log(`Removed ${videosRemovedCount} videos`);
  }

  blackList.forEach((ignoredChannel) => {
    videos.forEach((video) => {
      if (
        ignoredChannel.toLowerCase().includes(video.channelName.toLowerCase())
      ) {
        removeVideo(video.element!);
      }
    });
  });
};

const storageName: string = "blacklist";

const setChannelsToStorage = (): void => {
  localStorage.setItem(storageName, JSON.stringify(blackList));
  logger.success("Storage updated");
};

const getChannelsFromStorage = (): string[] => {
  let channels: string = localStorage.getItem(storageName) ?? "[]";
  let result: string[] = JSON.parse(channels);

  return result;
};

document.hasStorageAccess().then((hasAccess) => {
  if (hasAccess) {
    logger.success("Access to storage has been granted");
    blackList = getChannelsFromStorage();

    setInterval(filterVideos, 1000);
  } else {
    document.requestStorageAccess().then(() => {});
  }
});
