using System;
using System.Dynamic;
using System.Net;
using System.Text;
using System.IO;
using System.Web;

using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Runtime.Serialization.Json;
using System.Xml;
using System.Xml.Linq;

/*--------------------------------------------------------------------------
PerfectAPI.Client

Copyright (c) 2012 Perfect API LLC

Licensed under the MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

/*--------------------------------------------------------------------------
* DynamicJson
* ver 1.2.0.0 (May. 21th, 2010)
*
* created and maintained by neuecc <ils@neue.cc>
* licensed under Microsoft Public License(Ms-PL)
* http://neue.cc/
* http://dynamicjson.codeplex.com/
*--------------------------------------------------------------------------*/
namespace PerfectAPI.Client
{
	public class <%-: apiName | capitalize%>
	{
		private string endpointUri;
		
		public Amigen()
		{
			this.endpointUri = "<%- endPoint%>";
		}
		
		public class Result
		{
			public string RawResult { get; set; }
			
			public dynamic ParsedResult {
				get { return DynamicJson.Parse(RawResult); }
			}
		}
		
		<% 
		for(var i=0;i<commandSpecs.length;i++) {
			if (commandSpecs[i].preventUseOnServer) continue;
			var commandName = commandSpecs[i].name;
		%>
		public class <%-: commandName | capitalize%>Config {
			public <%-: commandName | capitalize%>Config() {
				<% 
				if (commandSpecs[i].environment) {
					var environment = commandSpecs[i].environment;
					for (var j=0;j<environment.length;j++) {
						var env = environment[j].parameter;
						%>
				Environment.<%- env%> = System.Environment.GetEnvironmentVariable("<%- env%>");
						<%
					}
				}
				%>
			}
			public class AnEnvironment {
				<% 
				if (commandSpecs[i].environment) {
					var environment = commandSpecs[i].environment;
					for (var j=0;j<environment.length;j++) {
						var env = environment[j].parameter;
						%>
				public string <%- env%> { get; set; }
						<%
					}
				}
				%>
			}
			public class OptionsList {
				public OptionsList() {
				
<%
if (commandSpecs[i].options) {
	for(var j=0;j<commandSpecs[i].options.length;j++) {
		var option = commandSpecs[i].options[j];
		if (option.option) { 
			if (option.default) { %>
			
					<%-: option.option | capitalize %>="<%- option.default%>";
						
			<% }
		} else { 
					
			if (option.default) { %>
			
					<%-: option.flag | capitalize %>=<%- option.default%>;
						
			<% }
		}
		
	}
}
%>
			
				}
			
			
<%
if (commandSpecs[i].options) {
	for(var j=0;j<commandSpecs[i].options.length;j++) {
		var option = commandSpecs[i].options[j];
		if (option.option) { %>
		
				public string <%-: option.option | capitalize%> { get; set; }
					 
		<% } else { %>
					
				public bool <%-: option.flag | capitalize%> { get; set; }

		<% }
	}
}
%>
			
			}
			OptionsList options = new OptionsList();
			
			public OptionsList Options {
				get { return options; }
				set { options = value; }
			}
			
			AnEnvironment environment = new AnEnvironment();
			public AnEnvironment Environment {
				get { return environment; }
				set { environment = value; }
			}

			<% 
			if (commandSpecs[i].parameter) {
				var param = commandSpecs[i].parameter
				if (param.type && param.type=='multi') { %>
			public string[] <%-: param.name | capitalize%> { get; set; }		
				<% } else { %>
			public string <%-: param.name | capitalize%> { get; set; }	
				<% }
			}
			%>
			
			public override string ToString()
			{
				//in application/x-www-form-urlencoded format (JSON is better but harder in .NET)
				var sb = new StringBuilder();
<% 
if (commandSpecs[i].parameter) {
	var param = commandSpecs[i].parameter
	if (param.type && param.type=='multi') { %>

				foreach (var val in <%-: param.name | capitalize%>) {
					sb.Append(HttpUtility.UrlEncode("<%- param.name%>="));
					sb.Append(HttpUtility.UrlEncode(val));
					sb.Append("&");
				}
	
	<% } else { %>

					sb.Append(HttpUtility.UrlEncode("<%- param.name%>="));
					sb.Append(HttpUtility.UrlEncode(<%-: param.name | capitalize%>));
					sb.Append("&");
	
	<% }
}

if (commandSpecs[i].options) {
	for(var j=0;j<commandSpecs[i].options.length;j++) {
		var option = commandSpecs[i].options[j];
		
		if (option.option) { %>
		
		
				if (!string.IsNullOrEmpty(Options.<%-: option.option | capitalize%>)) {
					sb.Append(HttpUtility.UrlEncode("<%- option.option%>="));
					sb.Append(HttpUtility.UrlEncode(Options.<%-: option.option | capitalize%>));
					sb.Append("&");
				}
		
		
		<% } else { %>
		
				sb.Append(HttpUtility.UrlEncode("<%- option.flag%>="));
				sb.Append(HttpUtility.UrlEncode(Options.<%-: option.flag | capitalize%>.ToString()));
				sb.Append("&");
		
		<%
		}
	}
}
%>
				
				return sb.ToString().TrimEnd('&');
			}
		}
		
		public Result <%-: commandName | capitalize%>(<%-: commandName | capitalize%>Config config) {
			
			var uri = new Uri(endpointUri + "<%- commandName%>", UriKind.Absolute);
			HttpWebRequest req = (HttpWebRequest)System.Net.WebRequest.Create(uri);
			
			req.Method = "POST";
			req.ContentType = "application/x-www-form-urlencoded";
			<% 
			if (commandSpecs[i].environment) {
				var environment = commandSpecs[i].environment;
				for (var j=0;j<environment.length;j++) {
					var env = environment[j].parameter;
					%>
			req.Headers.Add("<%- env%>", config.Environment.<%- env%>);
					<%
				}
			}
			%>
						
			var data = Encoding.UTF8.GetBytes(config.ToString());
			req.ContentLength = data.Length;
			
			using(var reqStream = req.GetRequestStream()) {
				reqStream.Write(data, 0, data.Length);
			}
			
			try {
				using( var response = req.GetResponse()) {
					using (var resStream = response.GetResponseStream()) {
						var reader = new StreamReader(resStream, Encoding.UTF8);
						var result = new Result();
						result.RawResult = reader.ReadToEnd();
						
						return result;
					}
				}
			} catch (Exception) {
				
				throw;
			}
		}
		
		<% } %>
	}

    public class DynamicJson : DynamicObject
    {
        private enum JsonType
        {
            @string, number, boolean, @object, array, @null
        }

        // public static methods

        /// <summary>from JsonSring to DynamicJson</summary>
        public static dynamic Parse(string json)
        {
            return Parse(json, Encoding.Unicode);
        }

        /// <summary>from JsonSring to DynamicJson</summary>
        public static dynamic Parse(string json, Encoding encoding)
        {
            using (var reader = JsonReaderWriterFactory.CreateJsonReader(encoding.GetBytes(json), XmlDictionaryReaderQuotas.Max))
            {
                return ToValue(XElement.Load(reader));
            }
        }

        /// <summary>from JsonSringStream to DynamicJson</summary>
        public static dynamic Parse(Stream stream)
        {
            using (var reader = JsonReaderWriterFactory.CreateJsonReader(stream, XmlDictionaryReaderQuotas.Max))
            {
                return ToValue(XElement.Load(reader));
            }
        }

        /// <summary>from JsonSringStream to DynamicJson</summary>
        public static dynamic Parse(Stream stream, Encoding encoding)
        {
            using (var reader = JsonReaderWriterFactory.CreateJsonReader(stream, encoding, XmlDictionaryReaderQuotas.Max, _ => { }))
            {
                return ToValue(XElement.Load(reader));
            }
        }

        /// <summary>create JsonSring from primitive or IEnumerable or Object({public property name:property value})</summary>
        public static string Serialize(object obj)
        {
            return CreateJsonString(new XStreamingElement("root", CreateTypeAttr(GetJsonType(obj)), CreateJsonNode(obj)));
        }

        // private static methods

        private static dynamic ToValue(XElement element)
        {
            var type = (JsonType)Enum.Parse(typeof(JsonType), element.Attribute("type").Value);
            switch (type)
            {
                case JsonType.boolean:
                    return (bool)element;
                case JsonType.number:
                    return (double)element;
                case JsonType.@string:
                    return (string)element;
                case JsonType.@object:
                case JsonType.array:
                    return new DynamicJson(element, type);
                case JsonType.@null:
                default:
                    return null;
            }
        }

        private static JsonType GetJsonType(object obj)
        {
            if (obj == null) return JsonType.@null;

            switch (Type.GetTypeCode(obj.GetType()))
            {
                case TypeCode.Boolean:
                    return JsonType.boolean;
                case TypeCode.String:
                case TypeCode.Char:
                case TypeCode.DateTime:
                    return JsonType.@string;
                case TypeCode.Int16:
                case TypeCode.Int32:
                case TypeCode.Int64:
                case TypeCode.UInt16:
                case TypeCode.UInt32:
                case TypeCode.UInt64:
                case TypeCode.Single:
                case TypeCode.Double:
                case TypeCode.Decimal:
                case TypeCode.SByte:
                case TypeCode.Byte:
                    return JsonType.number;
                case TypeCode.Object:
                    return (obj is IEnumerable) ? JsonType.array : JsonType.@object;
                case TypeCode.DBNull:
                case TypeCode.Empty:
                default:
                    return JsonType.@null;
            }
        }

        private static XAttribute CreateTypeAttr(JsonType type)
        {
            return new XAttribute("type", type.ToString());
        }

        private static object CreateJsonNode(object obj)
        {
            var type = GetJsonType(obj);
            switch (type)
            {
                case JsonType.@string:
                case JsonType.number:
                    return obj;
                case JsonType.boolean:
                    return obj.ToString().ToLower();
                case JsonType.@object:
                    return CreateXObject(obj);
                case JsonType.array:
                    return CreateXArray(obj as IEnumerable);
                case JsonType.@null:
                default:
                    return null;
            }
        }

        private static IEnumerable<XStreamingElement> CreateXArray<T>(T obj) where T : IEnumerable
        {
            return obj.Cast<object>()
                .Select(o => new XStreamingElement("item", CreateTypeAttr(GetJsonType(o)), CreateJsonNode(o)));
        }

        private static IEnumerable<XStreamingElement> CreateXObject(object obj)
        {
            return obj.GetType()
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Select(pi => new { Name = pi.Name, Value = pi.GetValue(obj, null) })
                .Select(a => new XStreamingElement(a.Name, CreateTypeAttr(GetJsonType(a.Value)), CreateJsonNode(a.Value)));
        }

        private static string CreateJsonString(XStreamingElement element)
        {
            using (var ms = new MemoryStream())
            using (var writer = JsonReaderWriterFactory.CreateJsonWriter(ms, Encoding.Unicode))
            {
                element.WriteTo(writer);
                writer.Flush();
                return Encoding.Unicode.GetString(ms.ToArray());
            }
        }

        // dynamic structure represents JavaScript Object/Array

        readonly XElement xml;
        readonly JsonType jsonType;

        /// <summary>create blank JSObject</summary>
        public DynamicJson()
        {
            xml = new XElement("root", CreateTypeAttr(JsonType.@object));
            jsonType = JsonType.@object;
        }

        private DynamicJson(XElement element, JsonType type)
        {
            Debug.Assert(type == JsonType.array || type == JsonType.@object);

            xml = element;
            jsonType = type;
        }

        public bool IsObject { get { return jsonType == JsonType.@object; } }

        public bool IsArray { get { return jsonType == JsonType.array; } }

        /// <summary>has property or not</summary>
        public bool IsDefined(string name)
        {
            return IsObject && (xml.Element(name) != null);
        }

        /// <summary>has property or not</summary>
        public bool IsDefined(int index)
        {
            return IsArray && (xml.Elements().ElementAtOrDefault(index) != null);
        }

        /// <summary>delete property</summary>
        public bool Delete(string name)
        {
            var elem = xml.Element(name);
            if (elem != null)
            {
                elem.Remove();
                return true;
            }
            else return false;
        }

        /// <summary>delete property</summary>
        public bool Delete(int index)
        {
            var elem = xml.Elements().ElementAtOrDefault(index);
            if (elem != null)
            {
                elem.Remove();
                return true;
            }
            else return false;
        }

        /// <summary>mapping to Array or Class by Public PropertyName</summary>
        public T Deserialize<T>()
        {
            return (T)Deserialize(typeof(T));
        }

        private object Deserialize(Type type)
        {
            return (IsArray) ? DeserializeArray(type) : DeserializeObject(type);
        }

        private dynamic DeserializeValue(XElement element, Type elementType)
        {
            var value = ToValue(element);
            if (value is DynamicJson)
            {
                value = ((DynamicJson)value).Deserialize(elementType);
            }
            return Convert.ChangeType(value, elementType);
        }

        private object DeserializeObject(Type targetType)
        {
            var result = Activator.CreateInstance(targetType);
            var dict = targetType.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanWrite)
                .ToDictionary(pi => pi.Name, pi => pi);
            foreach (var item in xml.Elements())
            {
                PropertyInfo propertyInfo;
                if (!dict.TryGetValue(item.Name.LocalName, out propertyInfo)) continue;
                var value = DeserializeValue(item, propertyInfo.PropertyType);
                propertyInfo.SetValue(result, value, null);
            }
            return result;
        }

        private object DeserializeArray(Type targetType)
        {
            if (targetType.IsArray) // Foo[]
            {
                var elemType = targetType.GetElementType();
                dynamic array = Array.CreateInstance(elemType, xml.Elements().Count());
                var index = 0;
                foreach (var item in xml.Elements())
                {
                    array[index++] = DeserializeValue(item, elemType);
                }
                return array;
            }
            else // List<Foo>
            {
                var elemType = targetType.GetGenericArguments()[0];
                dynamic list = Activator.CreateInstance(targetType);
                foreach (var item in xml.Elements())
                {
                    list.Add(DeserializeValue(item, elemType));
                }
                return list;
            }
        }

        // Delete
        public override bool TryInvoke(InvokeBinder binder, object[] args, out object result)
        {
            result = (IsArray)
                ? Delete((int)args[0])
                : Delete((string)args[0]);
            return true;
        }

        // IsDefined, if has args then TryGetMember
        public override bool TryInvokeMember(InvokeMemberBinder binder, object[] args, out object result)
        {
            if (args.Length > 0)
            {
                result = null;
                return false;
            }

            result = IsDefined(binder.Name);
            return true;
        }

        // Deserialize or foreach(IEnumerable)
        public override bool TryConvert(ConvertBinder binder, out object result)
        {
            if (binder.Type == typeof(IEnumerable) || binder.Type == typeof(object[]))
            {
                var ie = (IsArray)
                    ? xml.Elements().Select(x => ToValue(x))
                    : xml.Elements().Select(x => (dynamic)new KeyValuePair<string, object>(x.Name.LocalName, ToValue(x)));
                result = (binder.Type == typeof(object[])) ? ie.ToArray() : ie;
            }
            else
            {
                result = Deserialize(binder.Type);
            }
            return true;
        }

        private bool TryGet(XElement element, out object result)
        {
            if (element == null)
            {
                result = null;
                return false;
            }

            result = ToValue(element);
            return true;
        }

        public override bool TryGetIndex(GetIndexBinder binder, object[] indexes, out object result)
        {
            return (IsArray)
                ? TryGet(xml.Elements().ElementAtOrDefault((int)indexes[0]), out result)
                : TryGet(xml.Element((string)indexes[0]), out result);
        }

        public override bool TryGetMember(GetMemberBinder binder, out object result)
        {
            return (IsArray)
                ? TryGet(xml.Elements().ElementAtOrDefault(int.Parse(binder.Name)), out result)
                : TryGet(xml.Element(binder.Name), out result);
        }

        private bool TrySet(string name, object value)
        {
            var type = GetJsonType(value);
            var element = xml.Element(name);
            if (element == null)
            {
                xml.Add(new XElement(name, CreateTypeAttr(type), CreateJsonNode(value)));
            }
            else
            {
                element.Attribute("type").Value = type.ToString();
                element.ReplaceNodes(CreateJsonNode(value));
            }

            return true;
        }

        private bool TrySet(int index, object value)
        {
            var type = GetJsonType(value);
            var e = xml.Elements().ElementAtOrDefault(index);
            if (e == null)
            {
                xml.Add(new XElement("item", CreateTypeAttr(type), CreateJsonNode(value)));
            }
            else
            {
                e.Attribute("type").Value = type.ToString();
                e.ReplaceNodes(CreateJsonNode(value));
            }

            return true;
        }

        public override bool TrySetIndex(SetIndexBinder binder, object[] indexes, object value)
        {
            return (IsArray)
                ? TrySet((int)indexes[0], value)
                : TrySet((string)indexes[0], value);
        }

        public override bool TrySetMember(SetMemberBinder binder, object value)
        {
            return (IsArray)
                ? TrySet(int.Parse(binder.Name), value)
                : TrySet(binder.Name, value);
        }

        public override IEnumerable<string> GetDynamicMemberNames()
        {
            return (IsArray)
                ? xml.Elements().Select((x, i) => i.ToString())
                : xml.Elements().Select(x => x.Name.LocalName);
        }

        /// <summary>Serialize to JsonString</summary>
        public override string ToString()
        {
            // <foo type="null"></foo> is can't serialize. replace to <foo type="null" />
            foreach (var elem in xml.Descendants().Where(x => x.Attribute("type").Value == "null"))
            {
                elem.RemoveNodes();
            }
            return CreateJsonString(new XStreamingElement("root", CreateTypeAttr(jsonType), xml.Elements()));
        }
    }
}