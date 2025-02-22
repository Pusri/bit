import { CLIAspect, CLIMain, MainRuntime } from '@teambit/cli';
import { BitId } from '@teambit/legacy-bit-id';
import WorkspaceAspect, { Workspace } from '@teambit/workspace';
import { ConsumerNotFound } from '@teambit/legacy/dist/consumer/exceptions';
import chalk from 'chalk';
import getRemoteByName from '@teambit/legacy/dist/remotes/get-remote-by-name';
import { ComponentLogAspect } from './component-log.aspect';
import LogCmd from './log-cmd';
import { buildSnapGraph } from './snap-graph';

export class ComponentLogMain {
  constructor(private workspace: Workspace | undefined) {}

  async getLogs(id: string, isRemote: boolean, shortHash = false) {
    if (isRemote) {
      const consumer = this.workspace?.consumer;
      const bitId: BitId = BitId.parse(id, true);
      const remote = await getRemoteByName(bitId.scope as string, consumer);
      return remote.log(bitId);
    }
    if (!this.workspace) throw new ConsumerNotFound();
    const componentId = await this.workspace.resolveComponentId(id);
    const logs = await this.workspace.scope.getLogs(componentId, shortHash);
    logs.forEach((log) => {
      log.date = log.date ? new Date(parseInt(log.date)).toLocaleString() : undefined;
    });
    return logs;
  }

  async getLogsWithParents(id: string) {
    const logs = await this.getLogs(id, false, true);
    const graph = buildSnapGraph(logs);
    const sorted = graph.toposort();
    return sorted.map((node) => this.stringifyLogInfoOneLine(node.attr));
  }

  private stringifyLogInfoOneLine(logInfo: ComponentLogInfo) {
    const parents = logInfo.parents.length ? `Parent(s): ${logInfo.parents.join(', ')}` : '<N/A>';
    const lane = `Lane "${logInfo.lane}"`;
    return `${chalk.yellow(logInfo.hash)} ${logInfo.username || ''} ${logInfo.date || ''} ${
      logInfo.message
    } ${lane}, ${parents}`;
  }

  static slots = [];
  static dependencies = [CLIAspect, WorkspaceAspect];
  static runtime = MainRuntime;
  static async provider([cli, workspace]: [CLIMain, Workspace]) {
    const componentLog = new ComponentLogMain(workspace);
    cli.register(new LogCmd(componentLog));
    return componentLog;
  }
}

ComponentLogAspect.addRuntime(ComponentLogMain);

export type ComponentLogInfo = {
  hash: string;
  message: string;
  lane: string;
  parents: string[];
  username?: string;
  email?: string;
  date?: string;
  tag?: string;
};
