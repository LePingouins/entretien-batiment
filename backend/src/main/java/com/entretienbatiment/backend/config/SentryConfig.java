package com.entretienbatiment.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Map;

/**
 * Sentry integration: register a PII-scrubbing EventProcessor via reflection.
 *
 * This avoids compile-time references to `io.sentry.*` so the editor/IDE
 * doesn't report missing symbols when the SDK isn't on the classpath.
 */
@Configuration
@ConditionalOnClass(name = "io.sentry.Sentry")
public class SentryConfig {

    @Bean
    public Object sentryPiiScrubber() {
        try {
            ClassLoader cl = Thread.currentThread().getContextClassLoader();
            Class<?> sentryClass = Class.forName("io.sentry.Sentry", true, cl);
            Class<?> eventProcessorClass = Class.forName("io.sentry.EventProcessor", true, cl);
            Class<?> eventClass = Class.forName("io.sentry.SentryEvent", true, cl);

            Object proxy = Proxy.newProxyInstance(cl, new Class[]{eventProcessorClass}, (proxyObj, method, args) -> {
                if (!"process".equals(method.getName())) return null;
                try {
                    Object event = args[0];
                    // null-safe: getUser()
                    Method getUser = event.getClass().getMethod("getUser");
                    Object user = getUser.invoke(event);
                    if (user != null) {
                        try {
                            Method setEmail = user.getClass().getMethod("setEmail", String.class);
                            setEmail.invoke(user, (Object) null);
                        } catch (NoSuchMethodException ignored) { }
                        try {
                            Method setUsername = user.getClass().getMethod("setUsername", String.class);
                            setUsername.invoke(user, (Object) null);
                        } catch (NoSuchMethodException ignored) { }
                    }

                    // request headers / body
                    try {
                        Method getRequest = event.getClass().getMethod("getRequest");
                        Object request = getRequest.invoke(event);
                        if (request != null) {
                            try {
                                Method getHeaders = request.getClass().getMethod("getHeaders");
                                Object headers = getHeaders.invoke(request);
                                if (headers instanceof Map) {
                                    ((Map<?, ?>) headers).remove("Authorization");
                                    ((Map<?, ?>) headers).remove("Cookie");
                                } else if (headers != null) {
                                    try {
                                        Method remove = headers.getClass().getMethod("remove", Object.class);
                                        remove.invoke(headers, "Authorization");
                                        remove.invoke(headers, "Cookie");
                                    } catch (NoSuchMethodException ignored) { }
                                }
                            } catch (NoSuchMethodException ignored) { }
                            try {
                                Method setData = request.getClass().getMethod("setData", Object.class);
                                setData.invoke(request, (Object) null);
                            } catch (NoSuchMethodException ignored) { }
                        }
                    } catch (NoSuchMethodException ignored) { }

                    // extras
                    try {
                        Method getExtras = event.getClass().getMethod("getExtras");
                        Object extras = getExtras.invoke(event);
                        if (extras instanceof Map) {
                            ((Map<?, ?>) extras).remove("stack_trace_raw");
                        } else if (extras != null) {
                            try {
                                Method remove = extras.getClass().getMethod("remove", Object.class);
                                remove.invoke(extras, "stack_trace_raw");
                            } catch (NoSuchMethodException ignored) { }
                        }
                    } catch (NoSuchMethodException ignored) { }

                } catch (Exception ignored) { }
                return args[0];
            });

            Method add = sentryClass.getMethod("addEventProcessor", eventProcessorClass);
            add.invoke(null, proxy);
            return proxy;
        } catch (ClassNotFoundException e) {
            // Sentry not present on classpath — nothing to do
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
