export type UniqueKeyAction<A> =
  | {
      type: "append";
      items: A[];
    }
  | {
      type: "prepend";
      items: A[];
    }
  | {
      type: "insertAt";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAt";
      index: number;
      item: A;
    }
  | {
      type: "replaceAll";
      items: A[];
    }
  | {
      type: "deleteAt";
      index: number;
      count: number;
    }
  | {
      type: "move";
      index: number;
      count: number;
      destination: number;
    };

export type UniqueKeyWarning<A> =
  | {
      type: "insertAt-bounds";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAt-bounds";
      index: number;
      item: A;
    }
  | {
      type: "deleteAt-bounds";
      index: number;
      count: number;
    }
  | {
      type: "deleteAt-count-invalid";
      index: number;
      count: number;
    }
  | {
      type: "move-destination-bounds";
      index: number;
      count: number;
      destination: number;
    }
  | {
      type: "move-count-invalid";
      index: number;
      count: number;
      destination: number;
    };

export type UniqueKeyEffect<A> =
  | UniqueKeyAction<A>
  | {
      type: "move";
      index: number;
      count: number;
      destination: number;
    };
