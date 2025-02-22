import { Composition, CompositionProps } from '@teambit/compositions';
import { DeprecationInfo } from '@teambit/deprecation';
import { Descriptor } from '@teambit/envs';
import { ComponentID, ComponentIdObj } from '@teambit/component-id';

import { Tag } from '../../tag';
import { TagMap } from '../../tag-map';
import { TagProps } from '../../tag/tag';
// import { Snap } from '../../snap';

// ADDING MORE PROPERTIES HERE IS NOT ALLOWED!!! IF YOU NEED DATA PLEASE ADD A NEW
// HOOK FROM YOUR ASPECT!!!
// TODO: remove all properties from here to their rightful place in their aspects.
export type ComponentModelProps = {
  id: ComponentIdObj;
  description: string;
  buildStatus?: string;
  server?: ComponentServer;
  displayName: string;
  packageName: string; // pkg aspect
  elementsUrl?: string; // pkg aspect
  compositions?: CompositionProps[];
  tags?: TagProps[];
  issuesCount?: number; // component/issues aspect
  status?: any; // workspace aspect.
  deprecation?: DeprecationInfo; // deprecation aspect
  env?: Descriptor; // env aspect.
  labels?: string[];
  host?: string;
  latest?: string;
  preview?: ComponentPreview;
};

export type ComponentPreview = {
  includesEnvTemplate?: boolean
};

export type ComponentServer = {
  env: string;
  url: string;
};

export class ComponentModel {
  constructor(
    /**
     * id of the component
     */
    readonly id: ComponentID,

    /**
     * display name of the component.
     */
    readonly displayName: string,

    /**
     * package name of the component.
     */
    readonly packageName: string,

    /**
     * the component server.
     */
    readonly server: ComponentServer | undefined,

    /**
     * array of compositions
     */
    readonly compositions: Composition[],

    /**
     * tags of the component.
     */
    readonly tags: TagMap,

    /**
     * component build status
     */
    readonly buildStatus?: string,

    /**
     * issues of component.
     */
    readonly issuesCount?: number,
    /**
     * elements url
     */
    readonly elementsUrl?: string,
    /**
     * status of component.
     */
    readonly status?: any,

    /**
     * deprecation info of the component.
     */
    readonly deprecation?: DeprecationInfo,

    /**
     * env descriptor.
     */
    readonly environment?: Descriptor,

    /**
     * description of the component.
     */

    readonly description = '',

    readonly labels: string[] = [],

    /**
     * host of the component
     */
    readonly host?: string,

    /**
     * latest version of component
     */
    readonly latest?: string,

    readonly preview?: ComponentPreview
  ) {}

  get version() {
    if (!this.id.version) return 'new';
    return this.id.version;
  }

  /**
   * create an instance of a component from a plain object.
   */
  static from({
    id,
    server,
    displayName,
    compositions = [],
    packageName,
    elementsUrl,
    tags = [],
    deprecation,
    buildStatus,
    env,
    status,
    issuesCount,
    description,
    labels,
    host,
    latest,
    preview,
  }: ComponentModelProps) {
    return new ComponentModel(
      ComponentID.fromObject(id),
      displayName,
      packageName,
      server,
      Composition.fromArray(compositions),
      TagMap.fromArray(tags.map((tag) => Tag.fromObject(tag))),
      buildStatus,
      issuesCount,
      elementsUrl,
      status,
      deprecation,
      env,
      description,
      labels,
      host,
      latest,
      preview
    );
  }

  static fromArray(componentsProps: ComponentModelProps[]) {
    return componentsProps.map((rawComponent) => ComponentModel.from(rawComponent));
  }

  static empty() {
    return new ComponentModel(
      ComponentID.fromObject({ name: 'root', scope: 'temp' }),
      '',
      '',
      { env: '', url: '' },
      [],
      TagMap.empty()
    );
  }
}
