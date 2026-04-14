import ast
import logging

from strands.hooks.events import BeforeToolCallEvent
from strands.hooks.registry import HookProvider, HookRegistry

logger = logging.getLogger(__name__)


class SyntaxCheckHook(HookProvider):
    """Pre-flight Python syntax check for code_interpreter calls.

    Compiles the generated Python code with `compile()` before dispatching
    to the AgentCore sandbox. On SyntaxError, cancels the tool call and
    returns a clean error message to the model so it can fix and retry
    without paying sandbox cold-start latency.
    """

    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeToolCallEvent, self._check)

    def _check(self, event: BeforeToolCallEvent) -> None:
        if event.selected_tool is None:
            return
        if event.selected_tool.tool_name != "code_interpreter":
            return

        action = event.tool_use.get("input", {}).get("code_interpreter_input", {}).get("action", {})
        if action.get("type") != "executeCode":
            return
        if action.get("language") != "python":
            return

        code = action.get("code", "")
        if not code:
            return

        try:
            compile(code, "<agent-generated>", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        except SyntaxError as e:
            line_text = (e.text or "").rstrip()
            message = (
                f"SyntaxError: {e.msg} (line {e.lineno}, col {e.offset})\n"
                f"  {line_text}\n"
                "Pre-execution syntax check failed. Fix the syntax error and retry. "
                "Common causes: non-ASCII characters used as bare tokens (em-dash, smart quotes), "
                "unclosed brackets/strings, indentation mistakes."
            )
            logger.warning(
                "SyntaxCheckHook: cancelled code_interpreter call due to SyntaxError at line %s",
                e.lineno,
            )
            event.cancel_tool = message
